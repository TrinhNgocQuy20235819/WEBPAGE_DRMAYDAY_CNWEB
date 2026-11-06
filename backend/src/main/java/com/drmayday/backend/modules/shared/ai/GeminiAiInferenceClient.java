package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.*;

import java.net.SocketTimeoutException;
import java.util.*;

/** Provider-specific transport used by the existing HTTP client; no retries or model fallback. */
public final class GeminiAiInferenceClient implements AiInferenceClient {
    private final AiProperties properties;
    private final RestTemplate http;
    private final ObjectMapper json = new ObjectMapper()
            .enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS)
            .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
            .enable(JsonParser.Feature.STRICT_DUPLICATE_DETECTION);

    public GeminiAiInferenceClient(AiProperties properties) {
        this(properties, createHttp(properties));
    }

    GeminiAiInferenceClient(AiProperties properties, RestTemplate http) {
        this.properties = properties;
        this.http = http;
    }

    private static RestTemplate createHttp(AiProperties p) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(p.getConnectTimeoutMs());
        factory.setReadTimeout(p.getReadTimeoutMs());
        return new RestTemplate(factory);
    }

    Map<String, Object> buildRequest(AiInferenceRequest request) {
        byte[] bytes = request.getImageBytes();
        if (bytes == null || bytes.length == 0) throw error(ErrorCode.MEDIA_FILE_MISSING);
        if (bytes.length > AiValidationService.MAX_IMAGE_SIZE_BYTES) throw error(ErrorCode.MEDIA_FILE_TOO_LARGE);
        String mime = request.getMimeType() == null ? "" : request.getMimeType().trim().toLowerCase(Locale.ROOT);
        if (mime.equals("image/jpg")) mime = "image/jpeg";
        if (!Set.of("image/jpeg", "image/png", "image/webp").contains(mime)) throw error(ErrorCode.UNSUPPORTED_MEDIA);
        String prompt = "Analyze only the visible skin lesions in the attached image. "
                + "Return only the requested JSON. Count visible urticarial wheals as hives_count, "
                + "a nonnegative integer, only if they can be identified reliably. "
                + "If the image is unclear, not skin, or findings cannot be determined reliably, return null for hives_count. "
                + "Never substitute zero for uncertainty. Do not diagnose or claim medical accuracy.";
        Map<String, Object> schema = Map.of("type", "OBJECT",
                "properties", Map.of(
                        "hives_count", Map.of("type", "INTEGER", "minimum", 0, "nullable", true)),
                "required", List.of("hives_count"));
        return Map.of("contents", List.of(Map.of("role", "user", "parts", List.of(
                        Map.of("text", prompt),
                        Map.of("inlineData", Map.of("mimeType", mime, "data", Base64.getEncoder().encodeToString(bytes)))))),
                "generationConfig", Map.of("responseMimeType", "application/json", "responseSchema", schema,
                        "candidateCount", 1, "maxOutputTokens", 2048,
                        "thinkingConfig", Map.of("thinkingBudget", 0)));
    }

    @Override
    public AiInferenceResult infer(AiInferenceRequest request) {
        if (properties.getApiKey() == null || properties.getApiKey().isBlank()) throw error(ErrorCode.AI_PROVIDER_AUTH_FAILED);
        if (!Set.of("gemini-2.5-flash", "gemini-2.5-flash-lite").contains(properties.getModel()))
            throw error(ErrorCode.AI_PROVIDER_CAPABILITY_BLOCKED);
        Map<String, Object> body = buildRequest(request);
        String url = properties.getBaseUrl().replaceAll("/+$", "") + "/v1beta/models/" + properties.getModel() + ":generateContent";
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("x-goog-api-key", properties.getApiKey());
        long start = System.currentTimeMillis();
        try {
            ResponseEntity<String> response = http.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful()) throw error(ErrorCode.AI_INFERENCE_FAILED);
            AiInferenceResult result = parseResponse(response.getBody());
            result.setServiceUrl(url); // URL contains no API key or local image path.
            result.setLatencyMs(System.currentTimeMillis() - start);
            return result;
        } catch (HttpStatusCodeException ex) {
            int status = ex.getStatusCode().value();
            throw error(status == 401 || status == 403 || (status == 400 && invalidKey(ex.getResponseBodyAsString())) ? ErrorCode.AI_PROVIDER_AUTH_FAILED
                    : status == 429 ? ErrorCode.AI_PROVIDER_RATE_LIMITED : ErrorCode.AI_INFERENCE_FAILED);
        } catch (ResourceAccessException ex) {
            Throwable cause = ex;
            while (cause != null) {
                if (cause instanceof SocketTimeoutException) throw error(ErrorCode.AI_INFERENCE_TIMEOUT);
                cause = cause.getCause();
            }
            throw error(ErrorCode.AI_SERVICE_UNAVAILABLE);
        } catch (AppException ex) { throw ex; }
        catch (Exception ex) { throw error(ErrorCode.AI_INFERENCE_FAILED); }
    }

    AiInferenceResult parseResponse(String body) {
        try {
            if (body == null || body.isBlank()) throw invalid();
            JsonNode root = json.readTree(body);
            if (root == null || !root.isObject() || root.has("error")) throw invalid();
            JsonNode feedback = root.path("promptFeedback");
            if (feedback.hasNonNull("blockReason")) throw invalid();
            JsonNode candidates = root.path("candidates");
            if (!candidates.isArray() || candidates.size() != 1) throw invalid();
            JsonNode candidate = candidates.get(0);
            if (!"STOP".equals(candidate.path("finishReason").asText())) throw invalid();
            for (JsonNode rating : candidate.path("safetyRatings"))
                if (rating.path("blocked").asBoolean(false)) throw invalid();
            JsonNode parts = candidate.path("content").path("parts");
            if (!parts.isArray()) throw invalid();
            StringBuilder text = new StringBuilder();
            for (JsonNode part : parts) {
                if (part.path("thought").asBoolean(false)) continue;
                if (!part.path("text").isTextual()) throw invalid();
                text.append(part.path("text").textValue());
            }
            if (text.toString().isBlank()) throw invalid();
            JsonNode metrics = json.readTree(text.toString());
            if (metrics == null || !metrics.isObject() || metrics.size() != 1 || !metrics.has("hives_count")) throw invalid();
            JsonNode hives = metrics.path("hives_count");
            if (!hives.isIntegralNumber() || !hives.canConvertToInt() || hives.intValue() < 0) throw invalid();
            String version = root.path("modelVersion").asText("");
            if (!version.equals(properties.getModel())
                    && !version.matches(java.util.regex.Pattern.quote(properties.getModel()) + "-\\d.*")) throw invalid();
            return AiInferenceResult.builder().hivesCount(hives.intValue())
                    .isMock(false).modelName(version).build();
        } catch (AppException ex) { throw ex; }
        catch (Exception ex) { throw invalid(); }
    }

    private static AppException error(ErrorCode code) { return new AppException(code); }
    private static AppException invalid() { return error(ErrorCode.AI_INFERENCE_INVALID_RESPONSE); }

    private boolean invalidKey(String response) {
        try {
            for (JsonNode detail : json.readTree(response).path("error").path("details"))
                if ("API_KEY_INVALID".equals(detail.path("reason").asText())) return true;
        } catch (Exception ignored) { /* Never expose or log upstream error content. */ }
        return false;
    }
}
