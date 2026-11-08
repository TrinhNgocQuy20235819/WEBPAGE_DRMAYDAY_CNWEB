package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.SocketTimeoutException;
import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Component("httpAiInferenceClient")
public class HttpAiInferenceClient implements AiInferenceClient {

    private final AiProperties properties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final GeminiAiInferenceClient geminiClient;

    @Autowired
    public HttpAiInferenceClient(AiProperties properties) {
        this(properties, new ObjectMapper());
    }

    public HttpAiInferenceClient(AiProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
        this.restTemplate = createRestTemplate(properties);
        this.geminiClient = new GeminiAiInferenceClient(properties);
    }

    private static RestTemplate createRestTemplate(AiProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        return new RestTemplate(factory);
    }

    /** Fixed, non-clinical text probe; never used to produce hives/AUAS results. No retries. */
    public ConnectivityResult checkInceptionConnectivity() {
        if (!"inception".equalsIgnoreCase(properties.getProvider())
                || !"mercury-3".equals(properties.getModel()))
            throw new AppException(ErrorCode.AI_PROVIDER_CAPABILITY_BLOCKED);
        if (properties.getApiKey() == null || properties.getApiKey().isBlank())
            throw new AppException(ErrorCode.AI_PROVIDER_AUTH_FAILED);
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(properties.getApiKey());
        headers.setContentType(MediaType.APPLICATION_JSON);
        Map<String, Object> body = Map.of("model", properties.getModel(),
                "messages", java.util.List.of(Map.of("role", "user", "content", "Reply with the word OK.")),
                "max_completion_tokens", 64, "reasoning_effort", "instant");
        String url = properties.getBaseUrl().replaceAll("/+$", "") + "/v1/chat/completions";
        try {
            var response = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isBlank())
                throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode message = root.path("choices").path(0).path("message");
            if (!root.path("model").isTextual() || !properties.getModel().equals(root.path("model").asText())
                    || !"assistant".equals(message.path("role").asText())
                    || !message.path("content").isTextual() || message.path("content").asText().isBlank())
                throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
            // Return only safe metadata; no upstream content, credentials, or patient data.
            return new ConnectivityResult(root.path("model").asText(), true, false);
        } catch (HttpStatusCodeException ex) {
            int status = ex.getStatusCode().value();
            throw new AppException(status == 401 || status == 403 ? ErrorCode.AI_PROVIDER_AUTH_FAILED
                    : status == 429 ? ErrorCode.AI_PROVIDER_RATE_LIMITED : ErrorCode.AI_INFERENCE_FAILED);
        } catch (ResourceAccessException ex) {
            Throwable cause = ex;
            while (cause != null) {
                if (cause instanceof SocketTimeoutException) throw new AppException(ErrorCode.AI_INFERENCE_TIMEOUT);
                cause = cause.getCause();
            }
            throw new AppException(ErrorCode.AI_SERVICE_UNAVAILABLE);
        } catch (AppException ex) { throw ex; }
        catch (Exception ex) { throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE); }
    }

    public record ConnectivityResult(String model, boolean textConnectivity, boolean imageSupported) { }

    @Override
    public AiInferenceResult infer(AiInferenceRequest request) {
        if ("gemini".equalsIgnoreCase(properties.getProvider())) return geminiClient.infer(request);
        if ("inception".equalsIgnoreCase(properties.getProvider())) {
            // Mercury-3 is text only. Never send clinical images or synthesize metrics.
            throw new AppException(ErrorCode.AI_PROVIDER_CAPABILITY_BLOCKED);
        }
        if (!"generic".equalsIgnoreCase(properties.getProvider())) {
            throw new AppException(ErrorCode.AI_SERVICE_UNAVAILABLE);
        }
        String url = properties.getBaseUrl().replaceAll("/+$", "") + "/" + properties.getEndpoint().replaceAll("^/+", "");
        long startTime = System.currentTimeMillis();

        HttpHeaders headers = new HttpHeaders();
        if (properties.getApiKey() != null && !properties.getApiKey().isBlank()) {
            headers.setBearerAuth(properties.getApiKey());
        }

        HttpEntity<?> httpEntity;
        if (request.getImageBytes() != null && request.getImageBytes().length > 0) {
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            String filename = request.getFilename() != null && !request.getFilename().isBlank()
                    ? request.getFilename() : "lesion_image.jpg";

            ByteArrayResource resource = new ByteArrayResource(request.getImageBytes()) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            body.add("file", resource);
            if (request.getAttachmentId() != null) {
                body.add("attachment_id", request.getAttachmentId().toString());
            }
            httpEntity = new HttpEntity<>(body, headers);
        } else {
            // Fix A2-016: Send JSON with scalar fields (not arrays from MultiValueMap)
            headers.setContentType(MediaType.APPLICATION_JSON);
            Map<String, Object> jsonBody = new LinkedHashMap<>();
            if (request.getImageUrl() != null) jsonBody.put("image_url", request.getImageUrl());
            if (request.getAttachmentId() != null) jsonBody.put("attachment_id", request.getAttachmentId());
            httpEntity = new HttpEntity<>(jsonBody, headers);
        }

        try {
            log.info("Sending inference request to AI Service: {}", url);
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, httpEntity, String.class);
            long latency = System.currentTimeMillis() - startTime;

            // Fix A2-020: Empty or invalid response body returns AI_INFERENCE_INVALID_RESPONSE (7103, 502)
            if (response.getBody() == null || response.getBody().trim().isEmpty()) {
                log.warn("AI Service returned empty body");
                throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
            }

            if (!response.getStatusCode().is2xxSuccessful()) {
                log.warn("AI Service returned non-2xx status: {}", response.getStatusCode());
                throw new AppException(ErrorCode.AI_INFERENCE_FAILED);
            }

            JsonNode root;
            try {
                root = objectMapper.readTree(response.getBody());
            } catch (Exception ex) {
                log.error("AI Service returned invalid JSON");
                throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
            }

            // Reject non-object root JSON
            if (root == null || !root.isObject()) {
                log.error("AI Service returned non-object root JSON");
                throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
            }

            // Extract fields (supporting both snake_case and camelCase)
            JsonNode hivesNode = root.has("hives_count") ? root.get("hives_count") : root.get("hivesCount");
            JsonNode annotatedUrlNode = root.has("annotated_url") ? root.get("annotated_url") : root.get("annotatedUrl");
            JsonNode modelNode = root.has("model") ? root.get("model") : root.get("model_name");

            if (hivesNode == null || hivesNode.isNull()) {
                log.error("AI Service response missing required field (hives_count)");
                throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
            }

            // Fix A2-002: Validate raw JSON number before conversion.
            // Reject decimals (1.5, -0.5) and 32-bit int overflow (> Integer.MAX_VALUE)
            if (!hivesNode.isIntegralNumber() || !hivesNode.canConvertToInt()) {
                log.error("AI Service returned non-integral or overflow hives_count: {}", hivesNode);
                throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
            }
            long rawHives = hivesNode.asLong();
            if (rawHives < 0 || rawHives > Integer.MAX_VALUE) {
                log.error("AI Service returned negative or overflowing hives_count: {}", rawHives);
                throw new AppException(ErrorCode.AI_INFERENCE_INVALID_RESPONSE);
            }
            int hivesCount = (int) rawHives;

            String annotatedUrl = annotatedUrlNode != null && !annotatedUrlNode.isNull() ? annotatedUrlNode.asText() : null;
            String modelName = modelNode != null && !modelNode.isNull() ? modelNode.asText() : "ai-lesion-engine-v1";

            // Fix A2-017: Redact sensitive details, log only operational telemetry
            log.info("AI Service inference successful: hivesCount={}, latency={}ms", hivesCount, latency);

            return AiInferenceResult.builder()
                    .hivesCount(hivesCount)
                    .annotatedUrl(annotatedUrl)
                    .isMock(false)
                    .serviceUrl(url)
                    .latencyMs(latency)
                    .modelName(modelName)
                    .build();

        } catch (ResourceAccessException ex) {
            long latency = System.currentTimeMillis() - startTime;
            log.error("AI Service communication error after {}ms, cause={}", latency,
                    ex.getCause() == null ? "unknown" : ex.getCause().getClass().getSimpleName());
            if (ex.getCause() instanceof SocketTimeoutException) {
                throw new AppException(ErrorCode.AI_INFERENCE_TIMEOUT);
            }
            throw new AppException(ErrorCode.AI_SERVICE_UNAVAILABLE);
        } catch (HttpStatusCodeException ex) {
            // Fix A2-017: Redact raw upstream response body to prevent logging health data/credentials
            log.error("AI Service HTTP error: status={}", ex.getStatusCode());
            int status = ex.getStatusCode().value();
            throw new AppException(status == 401 || status == 403 ? ErrorCode.AI_PROVIDER_AUTH_FAILED
                    : status == 429 ? ErrorCode.AI_PROVIDER_RATE_LIMITED : ErrorCode.AI_INFERENCE_FAILED);
        } catch (AppException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error during AI inference: {}", ex.getClass().getSimpleName());
            throw new AppException(ErrorCode.AI_INFERENCE_FAILED);
        }
    }
}
