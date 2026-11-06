package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.*;
import com.drmayday.backend.modules.patient.lesion.entity.*;
import com.drmayday.backend.modules.patient.lesion.repository.*;
import com.drmayday.backend.modules.patient.lesion.service.LesionTrackingService;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.http.*;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.*;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.nio.file.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class AiSafetyRegressionTest {
    @TempDir Path root;

    @Test void productionAlwaysWinsRegardlessOfOrder() {
        for (String[] profiles : new String[][]{{"prod"}, {"prod","local"}, {"local","prod"}}) {
            AiProperties p = new AiProperties(); p.setMode("mock"); p.setAllowMock(true);
            MockEnvironment env = new MockEnvironment(); env.setActiveProfiles(profiles);
            var adapter = new AiInferenceAdapter(p, mock(HttpAiInferenceClient.class), new MockAiInferenceClient(), env);
            assertThrows(IllegalStateException.class, adapter::validateModeAtStartup);
            assertEquals(ErrorCode.AI_SERVICE_UNAVAILABLE, assertThrows(AppException.class,
                    () -> adapter.infer(AiInferenceRequest.builder().build())).getErrorCode());
        }
        AiProperties p = new AiProperties(); p.setMode("mock"); p.setAllowMock(true);
        MockEnvironment env = new MockEnvironment(); env.setActiveProfiles("local");
        var adapter = new AiInferenceAdapter(p, mock(HttpAiInferenceClient.class), new MockAiInferenceClient(), env);
        assertDoesNotThrow(adapter::validateModeAtStartup);
        assertTrue(adapter.infer(AiInferenceRequest.builder().attachmentId(1L).build()).isMock());
    }

    @Test void springSelectsServiceConstructorsWithoutExplicitTestFactories() {
        try (var ctx = new AnnotationConfigApplicationContext()) {
            for (Class<?> c : List.of(DotTonThuongDaRepository.class, ViTriTonThuongRepository.class,
                    AnhChupTonThuongRepository.class, TepDinhKemRepository.class, HoSoBenhAnRepository.class,
                    BenhNhanRepository.class, com.drmayday.backend.security.repository.SecurityAccountRepository.class))
                registerMock(ctx, c);
            ctx.registerBean(AiInferenceClient.class, () -> mock(AiInferenceClient.class));
            ctx.registerBean(AiProperties.class);
            ctx.register(AiValidationService.class, LocalAiImageReader.class, AiInferencePersistenceWriter.class,
                    LesionTrackingService.class, AiInferenceService.class);
            ctx.refresh();
            assertNotNull(ctx.getBean(AiInferenceService.class));
            assertNotNull(ctx.getBean(LesionTrackingService.class));
        }
    }
    private static <T> void registerMock(AnnotationConfigApplicationContext ctx, Class<T> type) {
        ctx.registerBean(type, () -> mock(type));
    }

    @Test void imageReaderConfinesPathsAndChecksActualMime() throws Exception {
        AiProperties p = new AiProperties(); p.setMediaRoot(root.toString());
        MockEnvironment env = new MockEnvironment(); env.setActiveProfiles("local");
        LocalAiImageReader reader = new LocalAiImageReader(p, env);
        Path image = root.resolve("test.png");
        ImageIO.write(new BufferedImage(8, 8, BufferedImage.TYPE_INT_RGB), "png", image.toFile());
        TepDinhKemEntity a = TepDinhKemEntity.builder().duongDanLuuTru("test.png").dinhDangTep("image/png").build();
        assertTrue(reader.read(a).length > 0);
        a.setDinhDangTep("image/jpeg");
        assertEquals(ErrorCode.UNSUPPORTED_MEDIA, assertThrows(AppException.class, () -> reader.read(a)).getErrorCode());
        a.setDuongDanLuuTru("../outside.png");
        assertEquals(ErrorCode.ACCESS_DENIED, assertThrows(AppException.class, () -> reader.read(a)).getErrorCode());
        a.setDuongDanLuuTru("absent.png");
        assertEquals(ErrorCode.MEDIA_FILE_MISSING, assertThrows(AppException.class, () -> reader.read(a)).getErrorCode());
        Files.write(root.resolve("fake.png"), new byte[]{1,2,3}); a.setDuongDanLuuTru("fake.png");
        assertEquals(ErrorCode.INVALID_FORMAT, assertThrows(AppException.class, () -> reader.read(a)).getErrorCode());
        Files.write(root.resolve("huge.png"), new byte[(int)AiValidationService.MAX_IMAGE_SIZE_BYTES+1]);
        a.setDuongDanLuuTru("huge.png");
        assertEquals(ErrorCode.MEDIA_FILE_TOO_LARGE, assertThrows(AppException.class, () -> reader.read(a)).getErrorCode());
        env.setActiveProfiles("prod", "local");
        assertEquals(ErrorCode.MEDIA_FILE_MISSING, assertThrows(AppException.class, () -> reader.read(a)).getErrorCode());
    }

    @Test void inceptionBlocksImagesAndStrictlyValidatesTextEnvelope() {
        AiProperties p = new AiProperties(); p.setProvider("inception"); p.setModel("mercury-3"); p.setApiKey("test-sentinel");
        HttpAiInferenceClient client = new HttpAiInferenceClient(p);
        RestTemplate http = mock(RestTemplate.class); ReflectionTestUtils.setField(client, "restTemplate", http);
        assertEquals(ErrorCode.AI_PROVIDER_CAPABILITY_BLOCKED, assertThrows(AppException.class,
                () -> client.infer(AiInferenceRequest.builder().imageBytes(new byte[]{1}).build())).getErrorCode());
        verifyNoInteractions(http);
        for (String body : List.of("", "broken", "{}", "{\"model\":\"wrong\",\"choices\":[]}")) {
            when(http.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(ResponseEntity.ok(body));
            assertEquals(ErrorCode.AI_INFERENCE_INVALID_RESPONSE, assertThrows(AppException.class,
                    client::checkInceptionConnectivity).getErrorCode());
        }
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"model\":\"mercury-3\",\"choices\":[{\"message\":{\"role\":\"assistant\",\"content\":\"OK\"}}]}"));
        var result = client.checkInceptionConnectivity();
        assertEquals("mercury-3", result.model()); assertTrue(result.textConnectivity()); assertFalse(result.imageSupported());
        assertFalse(p.toString().contains("test-sentinel"));
    }

    @Test void inceptionErrorsNeverExposeUpstreamBodyOrKey() {
        AiProperties p = new AiProperties(); p.setProvider("inception"); p.setModel("mercury-3"); p.setApiKey("test-sentinel");
        HttpAiInferenceClient client = new HttpAiInferenceClient(p);
        RestTemplate http = mock(RestTemplate.class); ReflectionTestUtils.setField(client, "restTemplate", http);
        for (int status : List.of(401,403,429,500,503)) {
            when(http.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                    .thenThrow(HttpClientErrorException.create(HttpStatusCode.valueOf(status), "", HttpHeaders.EMPTY,
                            "test-sentinel".getBytes(), null));
            AppException ex = assertThrows(AppException.class, client::checkInceptionConnectivity);
            assertEquals(status==401 || status==403 ? ErrorCode.AI_PROVIDER_AUTH_FAILED
                    : status==429 ? ErrorCode.AI_PROVIDER_RATE_LIMITED : ErrorCode.AI_INFERENCE_FAILED, ex.getErrorCode());
            assertFalse(ex.toString().contains("test-sentinel"));
        }
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new ResourceAccessException("redacted", new java.net.SocketTimeoutException()));
        assertEquals(ErrorCode.AI_INFERENCE_TIMEOUT, assertThrows(AppException.class, client::checkInceptionConnectivity).getErrorCode());
        when(http.exchange(anyString(), eq(HttpMethod.POST), any(HttpEntity.class), eq(String.class)))
                .thenThrow(new ResourceAccessException("redacted", new java.net.ConnectException()));
        assertEquals(ErrorCode.AI_SERVICE_UNAVAILABLE, assertThrows(AppException.class, client::checkInceptionConnectivity).getErrorCode());
    }

    @Test void concurrentOlderRequestCompletesLastAndCannotOverwriteNewer() throws Exception {
        var repo = mock(AnhChupTonThuongRepository.class);
        var photo = AnhChupTonThuongEntity.builder().maAnh(1L).maTepDinhKem(2L).build();
        when(repo.findLockedById(1L)).thenReturn(Optional.of(photo));
        var writer = new AiInferencePersistenceWriter(repo);
        var newerDone = new CountDownLatch(1);
        var pool = Executors.newFixedThreadPool(2);
        long olderStart = System.currentTimeMillis()-2000;
        long newerStart = olderStart+1000;
        try {
            var old = pool.submit(() -> { try { assertTrue(newerDone.await(5, TimeUnit.SECONDS)); }
                catch (InterruptedException e) { throw new RuntimeException(e); }
                writer.persistInferenceToPhoto(1L,2L,AiInferenceResult.builder().hivesCount(1).build(),olderStart); });
            var next = pool.submit(() -> { writer.persistInferenceToPhoto(1L,2L,
                    AiInferenceResult.builder().hivesCount(9).build(),newerStart); newerDone.countDown(); });
            next.get(5, TimeUnit.SECONDS); old.get(5, TimeUnit.SECONDS);
            assertEquals(9, photo.getSoLuongNotSan()); verify(repo,times(1)).save(photo);
        } finally { pool.shutdownNow(); }
    }

    @Test void aiPropertiesBindCorrectlyInDefaultAndSecurityTestProfiles() throws Exception {
        var defaultEnv = new MockEnvironment();
        defaultEnv.getPropertySources().addFirst(new org.springframework.core.io.support.ResourcePropertySource(
                new org.springframework.core.io.ClassPathResource("application.properties")));
        AiProperties defaultProps = org.springframework.boot.context.properties.bind.Binder.get(defaultEnv)
                .bind("ai.service", AiProperties.class).get();
        assertEquals("gemini", defaultProps.getProvider());
        assertEquals("https://generativelanguage.googleapis.com", defaultProps.getBaseUrl());
        assertEquals("gemini-2.5-flash", defaultProps.getModel());
        assertEquals("live", defaultProps.getMode());
        assertFalse(defaultProps.isAllowMock());
        assertEquals(60000, defaultProps.getReadTimeoutMs());

        var secTestEnv = new MockEnvironment();
        secTestEnv.getPropertySources().addFirst(new org.springframework.core.io.support.ResourcePropertySource(
                new org.springframework.core.io.ClassPathResource("application-security-test.properties")));
        AiProperties secTestProps = org.springframework.boot.context.properties.bind.Binder.get(secTestEnv)
                .bind("ai.service", AiProperties.class).get();
        assertEquals("generic", secTestProps.getProvider());
        assertEquals("http://127.0.0.1:5050", secTestProps.getBaseUrl());
        assertEquals("gemini-2.5-flash", secTestProps.getModel());
    }
}
