package com.drmayday.backend.modules.shared.ai;

import com.drmayday.backend.common.AppException;
import com.drmayday.backend.common.ErrorCode;
import com.drmayday.backend.modules.patient.lesion.entity.TepDinhKemEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.imageio.ImageIO;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Locale;

/** Local development/test reader only; this does not implement object storage. */
@Component
@RequiredArgsConstructor
public class LocalAiImageReader {
    private final AiProperties properties;
    private final Environment environment;

    public byte[] read(TepDinhKemEntity attachment) {
        var profiles = Arrays.asList(environment.getActiveProfiles());
        if (profiles.contains("prod") || profiles.contains("production")
                || profiles.stream().noneMatch(p -> java.util.Set.of("local", "dev", "test", "security-test").contains(p))) {
            throw new AppException(ErrorCode.MEDIA_FILE_MISSING);
        }
        try {
            if (properties.getMediaRoot().isBlank() || attachment.getDuongDanLuuTru() == null
                    || attachment.getDuongDanLuuTru().isBlank()) throw new AppException(ErrorCode.MEDIA_FILE_MISSING);
            Path root = Path.of(properties.getMediaRoot()).toRealPath();
            Path supplied = Path.of(attachment.getDuongDanLuuTru());
            Path path = (supplied.isAbsolute() ? supplied : root.resolve(supplied)).normalize();
            // Both lexical and real-path checks: traversal and symlinks cannot escape the root.
            if (!path.startsWith(root)) throw new AppException(ErrorCode.ACCESS_DENIED);
            path = path.toRealPath();
            if (!path.startsWith(root)) throw new AppException(ErrorCode.ACCESS_DENIED);
            if (!Files.isRegularFile(path)) throw new AppException(ErrorCode.MEDIA_FILE_MISSING);
            byte[] bytes;
            try (var input = Files.newInputStream(path)) {
                bytes = input.readNBytes((int) AiValidationService.MAX_IMAGE_SIZE_BYTES + 1);
            }
            if (bytes.length > AiValidationService.MAX_IMAGE_SIZE_BYTES) throw new AppException(ErrorCode.MEDIA_FILE_TOO_LARGE);
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw new AppException(ErrorCode.INVALID_FORMAT);
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    String actual = switch (format) {
                        case "jpeg", "jpg" -> "image/jpeg";
                        case "png" -> "image/png";
                        case "webp" -> "image/webp";
                        default -> "";
                    };
                    String declared = attachment.getDinhDangTep() == null ? "" : attachment.getDinhDangTep().trim().toLowerCase(Locale.ROOT);
                    if (declared.equals("image/jpg")) declared = "image/jpeg";
                    if (actual.isEmpty() || !actual.equals(declared)) throw new AppException(ErrorCode.UNSUPPORTED_MEDIA);
                    // Bound decoded allocation as well as compressed bytes.
                    if ((long) reader.getWidth(0) * reader.getHeight(0) > 25_000_000L)
                        throw new AppException(ErrorCode.MEDIA_FILE_TOO_LARGE);
                    if (reader.read(0) == null) throw new AppException(ErrorCode.INVALID_FORMAT);
                } finally { reader.dispose(); }
            }
            return bytes;
        } catch (AppException ex) { throw ex; }
        catch (java.nio.file.NoSuchFileException ex) { throw new AppException(ErrorCode.MEDIA_FILE_MISSING); }
        catch (Exception ex) { throw new AppException(ErrorCode.INVALID_FORMAT); }
    }
}
