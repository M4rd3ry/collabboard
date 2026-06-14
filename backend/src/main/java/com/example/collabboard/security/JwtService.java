package com.example.collabboard.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  @Value("${app.jwt.secret}")
  private String secret;

  @Value("${app.jwt.issuer}")
  private String issuer;

  @Value("${app.jwt.accessMinutes:60}")
  private long accessMinutes;

  private SecretKey key;

  @PostConstruct
  void init() {
    key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
  }

  public String issueToken(Long userId, String email, String role) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(accessMinutes * 60);
    return Jwts.builder()
        .issuer(issuer)
        .subject(String.valueOf(userId))
        .claim("email", email)
        .claim("role", role)
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .signWith(key)
        .compact();
  }

  public JwtUser parse(String token) {
    var claims = Jwts.parser()
        .verifyWith(key)
        .requireIssuer(issuer)
        .build()
        .parseSignedClaims(token)
        .getPayload();

    Long userId = Long.valueOf(claims.getSubject());
    String email = claims.get("email", String.class);
    String role = claims.get("role", String.class);
    return new JwtUser(userId, email, role);
  }

  public record JwtUser(Long userId, String email, String role) {}
}
