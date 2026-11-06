package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.*;
import org.junit.jupiter.api.*;
import org.mockito.ArgumentCaptor;
import org.springframework.http.*;
import org.springframework.web.client.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.net.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class GeminiAiInferenceClientTest {
    private AiProperties p;
    private RestTemplate http;
    private GeminiAiInferenceClient client;
    private static final String KEY = "dummy-unit-test-key";

    @BeforeEach void setup() {
        p = new AiProperties(); p.setProvider("gemini"); p.setModel("gemini-2.5-flash");
        p.setBaseUrl("https://generativelanguage.googleapis.com"); p.setApiKey(KEY);
        http = mock(RestTemplate.class); client = new GeminiAiInferenceClient(p, http);
    }

    private AiInferenceRequest image() throws Exception {
        var stream = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), "png", stream);
        return AiInferenceRequest.builder().imageBytes(stream.toByteArray()).mimeType("image/png").build();
    }

    private String envelope(String metrics) throws Exception {
        return new ObjectMapper().writeValueAsString(Map.of("modelVersion", p.getModel(), "candidates", List.of(
                Map.of("finishReason", "STOP", "content", Map.of("role", "model", "parts", List.of(Map.of("text", metrics)))))));
    }

    private void response(String body) {
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class))).thenReturn(ResponseEntity.ok(body));
    }

    private void invalid(String body) {
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE,
                assertThrows(AppException.class, () -> client.parseResponse(body)).getErrorCode());
    }

    @Test void sendsActualImageBytesUsingGeminiHeadersAndStructuredSchema() throws Exception {
        var image = image(); response(envelope("{\"hives_count\":12}"));
        var result = client.infer(image);
        var entity = ArgumentCaptor.forClass(HttpEntity.class);
        verify(http, times(1)).exchange(eq("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"),
                eq(HttpMethod.POST), entity.capture(), eq(String.class));
        assertEquals(KEY, entity.getValue().getHeaders().getFirst("x-goog-api-key"));
        assertNull(entity.getValue().getHeaders().getFirst("Authorization"));
        var body = new ObjectMapper().valueToTree(entity.getValue().getBody());
        var inline = body.path("contents").get(0).path("parts").get(1).path("inlineData");
        assertEquals("image/png", inline.path("mimeType").asText());
        assertArrayEquals(image.getImageBytes(), Base64.getDecoder().decode(inline.path("data").asText()));
        assertEquals("application/json", body.path("generationConfig").path("responseMimeType").asText());
        assertEquals(1, body.path("generationConfig").path("responseSchema").path("required").size());
        assertFalse(body.has("messages")); assertFalse(body.has("model"));
        assertEquals(12, result.getHivesCount());
        assertFalse(result.isMock()); assertNull(result.getAnnotatedUrl());
        assertFalse(result.getServiceUrl().contains(KEY)); assertEquals("gemini-2.5-flash", result.getModelName());
    }

    @Test void missingKeyFailsBeforeNetwork() throws Exception {
        p.setApiKey(""); var request = image();
        assertEquals(ErrorCode.AI_PROVIDER_AUTH_FAILED, assertThrows(AppException.class, () -> client.infer(request)).getErrorCode());
        verifyNoInteractions(http);
    }

    @Test void manuallySelectedLiteWorksAndGenerationModelsAreRefused() throws Exception {
        p.setModel("gemini-2.5-flash-lite"); response(envelope("{\"hives_count\":1}"));
        assertEquals(p.getModel(), client.infer(image()).getModelName());
        p.setModel("gemini-2.5-flash-image"); var request = image();
        assertEquals(ErrorCode.AI_PROVIDER_CAPABILITY_BLOCKED, assertThrows(AppException.class, () -> client.infer(request)).getErrorCode());
        verify(http,times(1)).exchange(anyString(),eq(HttpMethod.POST),any(HttpEntity.class),eq(String.class));
    }

    @Test void strictHivesNumericTypes() throws Exception {
        for (String value : List.of("1.5", "1.0", "-1", "4294967297", "\"12\"", "null", "true"))
            invalid(envelope("{\"hives_count\":"+value+"}"));
        var result=client.parseResponse(envelope("{\"hives_count\":2147483647}"));
        assertEquals(Integer.MAX_VALUE,result.getHivesCount());
        assertDoesNotThrow(() -> new AiValidationService().validateInferenceResult(result));
    }

    @Test void malformedMissingDuplicateOrExtraDataFailsClosed() throws Exception {
        for (String metrics : List.of("broken", "{}", "[]",
                "{\"hives_count\":1} {}", "```json\n{\"hives_count\":1}\n```",
                "{\"hives_count\":1,\"hives_count\":2}",
                "{\"hives_count\":1,\"invented\":true}")) invalid(envelope(metrics));
        invalid(""); invalid("broken"); invalid("{} {}"); invalid("{\"candidates\":[]}");
    }

    @Test void missingCandidateTextAndBlockedOrTruncatedResponsesAreRejected() throws Exception {
        invalid("{\"promptFeedback\":{\"blockReason\":\"SAFETY\"}}");
        for (String reason : List.of("SAFETY", "MAX_TOKENS", "RECITATION", "OTHER", ""))
            invalid(envelope("{\"hives_count\":1}").replace("\"STOP\"", "\""+reason+"\""));
        invalid("{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[]}}]}");
        String blocked=envelope("{\"hives_count\":1}");
        var root=new ObjectMapper().readTree(blocked);
        ((com.fasterxml.jackson.databind.node.ObjectNode)root.path("candidates").get(0)).putArray("safetyRatings")
                .addObject().put("blocked", true);
        invalid(root.toString());
    }

    @Test void nullHivesCountIsRejectedAsInvalidResponse() throws Exception {
        invalid(envelope("{\"hives_count\":null}"));
    }

    @Test void wrongOrMissingModelVersionIsNotReportedAsConfiguredModel() throws Exception {
        String response=envelope("{\"hives_count\":1}");
        invalid(response.replace("gemini-2.5-flash","gemini-2.5-flash-lite"));
        invalid(response.replace("gemini-2.5-flash",""));
    }

    @Test void mapsProviderErrorsWithoutLeakingKeyOrRawResponseAndNeverRetries() throws Exception {
        var request=image();
        for (int status : List.of(401,403,429,500,503)) {
            reset(http);
            when(http.exchange(anyString(),eq(HttpMethod.POST),any(HttpEntity.class),eq(String.class)))
                    .thenThrow(HttpClientErrorException.create(HttpStatusCode.valueOf(status), "", HttpHeaders.EMPTY, KEY.getBytes(), null));
            var ex=assertThrows(AppException.class, () -> client.infer(request));
            assertEquals(status==401||status==403 ? ErrorCode.AI_PROVIDER_AUTH_FAILED
                    : status==429 ? ErrorCode.AI_PROVIDER_RATE_LIMITED : ErrorCode.AI_INFERENCE_FAILED,ex.getErrorCode());
            assertFalse(ex.toString().contains(KEY)); assertNull(ex.getCause());
            verify(http,times(1)).exchange(anyString(),eq(HttpMethod.POST),any(HttpEntity.class),eq(String.class));
        }
    }

    @Test void nativeInvalidKey400IsAuthenticationFailure() throws Exception {
        var request=image();
        when(http.exchange(anyString(),eq(HttpMethod.POST),any(HttpEntity.class),eq(String.class)))
                .thenThrow(HttpClientErrorException.create(HttpStatus.BAD_REQUEST,"",HttpHeaders.EMPTY,
                        "{\"error\":{\"details\":[{\"reason\":\"API_KEY_INVALID\"}]}}".getBytes(),null));
        assertEquals(ErrorCode.AI_PROVIDER_AUTH_FAILED,assertThrows(AppException.class,()->client.infer(request)).getErrorCode());
    }

    @Test void mapsTimeoutAndNetworkUnavailability() throws Exception {
        var request=image();
        when(http.exchange(anyString(),eq(HttpMethod.POST),any(HttpEntity.class),eq(String.class)))
                .thenThrow(new ResourceAccessException(KEY,new SocketTimeoutException()));
        assertEquals(ErrorCode.AI_INFERENCE_TIMEOUT,assertThrows(AppException.class,()->client.infer(request)).getErrorCode());
        when(http.exchange(anyString(),eq(HttpMethod.POST),any(HttpEntity.class),eq(String.class)))
                .thenThrow(new ResourceAccessException(KEY,new ConnectException()));
        assertEquals(ErrorCode.AI_SERVICE_UNAVAILABLE,assertThrows(AppException.class,()->client.infer(request)).getErrorCode());
    }

    @Test void requestRejectsMissingOversizeAndUnsupportedMime() throws Exception {
        assertThrows(AppException.class, () -> client.buildRequest(AiInferenceRequest.builder().build()));
        assertEquals(ErrorCode.MEDIA_FILE_TOO_LARGE,assertThrows(AppException.class,()->client.buildRequest(
                AiInferenceRequest.builder().imageBytes(new byte[(int)AiValidationService.MAX_IMAGE_SIZE_BYTES+1]).mimeType("image/png").build())).getErrorCode());
        var bad=image(); bad.setMimeType("application/pdf");
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA,assertThrows(AppException.class,()->client.buildRequest(bad)).getErrorCode());
    }
}
