package com.example.PaduchuAndham.controller;

import com.example.PaduchuAndham.model.User;
import com.example.PaduchuAndham.repository.UserRepository;
import com.example.PaduchuAndham.security.JwtUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

/**
 * Accepts either { idToken } (GSI One-Tap) OR { accessToken } (popup token flow).
 * Verifies the token with Google and issues an application JWT.
 */
@RestController
@RequestMapping("/api/auth/oauth")
public class OAuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final String googleClientId; // optional, used to verify audience for idToken
    private final RestTemplate restTemplate = new RestTemplate();

    public OAuthController(UserRepository userRepository,
                           JwtUtil jwtUtil,
                           PasswordEncoder passwordEncoder,
                           @Value("${google.client.id:}") String googleClientId) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
        this.googleClientId = googleClientId;
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleSignIn(@RequestBody TokenRequest request) {
        try {
            String idToken = request.getIdToken();
            String accessToken = request.getAccessToken();

            Map<String, Object> profile = null;

            if (idToken != null && !idToken.isBlank()) {
                // Validate id_token via Google's tokeninfo endpoint
                String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken;
                ResponseEntity<Map> resp = restTemplate.getForEntity(url, Map.class);
                if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid ID token"));
                }
                Map<String, Object> payload = resp.getBody();

                // Optional: verify audience matches your client id
                if (googleClientId != null && !googleClientId.isBlank()) {
                    String aud = (String) payload.get("aud");
                    if (aud == null || !aud.equals(googleClientId)) {
                        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                                .body(Map.of("error", "Invalid token audience"));
                    }
                }
                profile = payload; // contains email, email_verified, name, sub...
            } else if (accessToken != null && !accessToken.isBlank()) {
                // Validate access token by calling userinfo endpoint
                String url = "https://www.googleapis.com/oauth2/v3/userinfo";
                HttpHeaders headers = new HttpHeaders();
                headers.setBearerAuth(accessToken);
                HttpEntity<Void> entity = new HttpEntity<>(headers);
                ResponseEntity<Map> resp = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);
                if (!resp.getStatusCode().is2xxSuccessful() || resp.getBody() == null) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid access token"));
                }
                profile = resp.getBody(); // contains email, email_verified, name, sub...
            } else {
                return ResponseEntity.badRequest().body(Map.of("error", "idToken or accessToken required"));
            }

            // Extract email & verification
            String email = (String) profile.get("email");
            if (email == null || email.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Email missing in Google profile"));
            }
            boolean emailVerified = false;
            Object ev = profile.get("email_verified");
            if (ev instanceof Boolean) emailVerified = (Boolean) ev;
            else if (ev instanceof String) emailVerified = "true".equalsIgnoreCase((String) ev) || "1".equals(ev);

            // Optionally reject unverified emails:
            // if (!emailVerified) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error","Email not verified"));

            // Find or create user
            User user = userRepository.findByEmail(email).orElseGet(() -> {
                // create username based on email local part, add random suffix if needed
                String base = email.split("@")[0];
                String usernameCandidate = base;
                int tries = 0;
                while (userRepository.existsByUsername(usernameCandidate) && tries < 10) {
                    usernameCandidate = base + (int) (Math.random() * 10000);
                    tries++;
                }
                String hashedRandom = passwordEncoder.encode(UUID.randomUUID().toString());
                User created = new User(usernameCandidate, email, hashedRandom, Collections.singletonList("ROLE_USER"));
                return userRepository.save(created);
            });

            // Generate application JWT (adjust generateToken signature to your JwtUtil implementation)
            String token = jwtUtil.generateToken(user.getId(), user.getUsername(), user.getRoles());
            return ResponseEntity.ok(Map.of("token", token, "tokenType", "Bearer"));
        } catch (org.springframework.web.client.HttpClientErrorException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid token"));
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Google sign-in failed"));
        }
    }

    // Request DTO accepts either idToken or accessToken
    public static class TokenRequest {
        private String idToken;
        private String accessToken;
        public String getIdToken() { return idToken; }
        public void setIdToken(String idToken) { this.idToken = idToken; }
        public String getAccessToken() { return accessToken; }
        public void setAccessToken(String accessToken) { this.accessToken = accessToken; }
    }
}
