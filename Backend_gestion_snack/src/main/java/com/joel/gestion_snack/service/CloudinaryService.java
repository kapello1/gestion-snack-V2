package com.joel.gestion_snack.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {

    private final Cloudinary cloudinary;

    /**
     * Upload une image vers Cloudinary et retourne l'URL sécurisée (https).
     *
     * @param file      fichier image reçu depuis le client
     * @param publicId  identifiant unique dans Cloudinary (ex. "product_42")
     * @return URL publique HTTPS de l'image stockée
     */
    public String uploadImage(MultipartFile file, String publicId) throws IOException {
        Map<?, ?> result = cloudinary.uploader().upload(
                file.getBytes(),
                ObjectUtils.asMap(
                        "public_id",  "gestion-snack/products/" + publicId,
                        "overwrite",  true,
                        "resource_type", "image"
                )
        );
        String url = (String) result.get("secure_url");
        log.info("Image uploadée sur Cloudinary : {}", url);
        return url;
    }

    /**
     * Supprime une image sur Cloudinary à partir de son publicId.
     * Ne lève pas d'exception si l'image n'existe pas.
     *
     * @param publicId identifiant Cloudinary (ex. "gestion-snack/products/product_42")
     */
    public void deleteImage(String publicId) {
        try {
            cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            log.info("Image supprimée sur Cloudinary : {}", publicId);
        } catch (IOException e) {
            log.warn("Impossible de supprimer l'image Cloudinary {} : {}", publicId, e.getMessage());
        }
    }
}
