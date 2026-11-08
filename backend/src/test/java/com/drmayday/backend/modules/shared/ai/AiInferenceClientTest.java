package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.net.SocketTimeoutException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AiInferenceClientTest {

    private AiProperties properties;
    private RestTemplate restTemplate;
    private ObjectMapper objectMapper;
    private HttpAiInferenceClient httpClient;
    private MockAiInferenceClient mockClient;
    private AiInferenceAdapter adapter;

    @BeforeEach
    void setUp() {
        properties = new AiProperties();
        properties.setBaseUrl("http://127.0.0.1:5050");
        properties.setEndpoint("/api/v1/predict");
        properties.setMode("live");
        properties.setAllowMock(false);

        restTemplate = mock(RestTemplate.class);
        objectMapper = new ObjectMapper();

        httpClient = new HttpAiInferenceClient(properties, objectMapper);
        ReflectionTestUtils.setField(httpClient, "restTemplate", restTemplate);

        mockClient = new MockAiInferenceClient();
        adapter = new AiInferenceAdapter(properties, httpClient, mockClient);
    }

    @Test
    void testLiveInferenceSuccess_PositiveHives() {
        String responseJson = "{\"status\":\"success\",\"hives_count\":14,\"annotated_url\":\"http://ai/annotated.jpg\",\"model\":\"yolov8\"}";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok(responseJson));

        AiInferenceRequest request = AiInferenceRequest.builder()
                .attachmentId(10L)
                .filename("lesion.jpg")
                .imageBytes(new byte[]{1, 2, 3})
                .build();

        AiInferenceResult result = adapter.infer(request);

        assertNotNull(result);
        assertEquals(14, result.getHivesCount());
        assertEquals("http://ai/annotated.jpg", result.getAnnotatedUrl());
        assertFalse(result.isMock());
        assertTrue(result.getLatencyMs() >= 0);
    }

    @Test
    void testLiveInferenceSuccess_ZeroHives() {
        String responseJson = "{\"hives_count\":0,\"annotated_url\":null}";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok(responseJson));

        AiInferenceRequest request = AiInferenceRequest.builder()
                .attachmentId(11L)
                .imageBytes(new byte[]{1, 2, 3})
                .build();

        AiInferenceResult result = adapter.infer(request);

        assertEquals(0, result.getHivesCount());
    }

    @Test
    void testLiveInferenceTimeout() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenThrow(new ResourceAccessException("Read timed out", new SocketTimeoutException("timeout")));

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(12L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_INFERENCE_TIMEOUT, ex.getErrorCode());
        assertEquals(7102, ex.getErrorCode().getCode());
    }

    @Test
    void testLiveInferenceServiceUnavailable() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenThrow(new ResourceAccessException("Connection refused"));

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(13L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_SERVICE_UNAVAILABLE, ex.getErrorCode());
        assertEquals(7104, ex.getErrorCode().getCode());
    }

    @Test
    void testLiveInferenceHttp500() {
        HttpStatusCodeException httpEx = mock(HttpStatusCodeException.class);
        when(httpEx.getStatusCode()).thenReturn(HttpStatus.INTERNAL_SERVER_ERROR);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class))).thenThrow(httpEx);

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(14L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_INFERENCE_FAILED, ex.getErrorCode());
        assertEquals(7101, ex.getErrorCode().getCode());
    }

    // A2-002 Regression: Reject negative hives count
    @Test
    void testLiveInferenceNegativeHivesCount() {
        String responseJson = "{\"hives_count\":-5}";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok(responseJson));

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(15L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, ex.getErrorCode());
        assertEquals(7103, ex.getErrorCode().getCode());
    }

    // A2-002 Regression: Reject fractional hives count (1.5)
    @Test
    void testLiveInferenceFractionalHivesCount() {
        String responseJson = "{\"hives_count\":1.5}";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok(responseJson));

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(151L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, ex.getErrorCode());
        assertEquals(7103, ex.getErrorCode().getCode());
    }

    // A2-002 Regression: Reject negative fractional hives count (-0.5)
    @Test
    void testLiveInferenceNegativeFractionalHivesCount() {
        String responseJson = "{\"hives_count\":-0.5}";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok(responseJson));

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(152L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, ex.getErrorCode());
        assertEquals(7103, ex.getErrorCode().getCode());
    }

    // A2-002 Regression: Reject 64-bit integer overflow hives count (4294967297)
    @Test
    void testLiveInferenceOverflowHivesCount() {
        String responseJson = "{\"hives_count\":4294967297}";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok(responseJson));

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(153L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, ex.getErrorCode());
        assertEquals(7103, ex.getErrorCode().getCode());
    }

    // A2-020 Regression: Empty body maps to 7103
    @Test
    void testLiveInferenceEmptyBodyThrows7103() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok("   "));

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(156L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, ex.getErrorCode());
        assertEquals(7103, ex.getErrorCode().getCode());
    }

    @Test
    void testLiveInferenceMissingFields() {
        String responseJson = "{\"status\":\"ok\"}";
        when(restTemplate.exchange(anyString(), eq(HttpMethod.POST), any(), eq(String.class)))
                .thenReturn(ResponseEntity.ok(responseJson));

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(16L).imageBytes(new byte[]{1}).build();

        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, ex.getErrorCode());
    }

    // A2-006 Regression: Fail-closed mock mode when allowMock is false
    @Test
    void testMockInferenceMode_DisallowedWhenAllowMockIsFalse() {
        properties.setMode("mock");
        properties.setAllowMock(false);

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(7L).build();
        AppException ex = assertThrows(AppException.class, () -> adapter.infer(request));
        assertEquals(ErrorCode.AI_SERVICE_UNAVAILABLE, ex.getErrorCode());
        assertEquals(7104, ex.getErrorCode().getCode());
    }

    @Test
    void testMockInferenceMode_AllowedWhenExplicitlyConfigured() {
        properties.setMode("mock");
        properties.setAllowMock(true);

        AiInferenceRequest request = AiInferenceRequest.builder().attachmentId(7L).build();
        AiInferenceResult result = adapter.infer(request);

        assertNotNull(result);
        assertTrue(result.isMock());
        assertEquals(7, result.getHivesCount());
        assertTrue(result.getLatencyMs() > 0);
    }
}
