package com.example.collabboard.security;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
  private final UserAccountRepository users;
  private final PasswordEncoder encoder;
  private final JwtService jwt;

  @PostMapping("/register")
  public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
    if (users.existsByEmail(req.email())) {
      return ResponseEntity.badRequest().body(new ApiError("Email already registered"));
    }
    UserAccount u = UserAccount.builder()
        .email(req.email().toLowerCase())
        .passwordHash(encoder.encode(req.password()))
        .role(Role.USER)
        .build();
    u = users.save(u);
    String token = jwt.issueToken(u.getId(), u.getEmail(), u.getRole().name());
    return ResponseEntity.ok(new AuthResponse(token, u.getEmail(), u.getRole().name()));
  }

  @PostMapping("/login")
  public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
    var uOpt = users.findByEmail(req.email().toLowerCase());
    if (uOpt.isEmpty() || !encoder.matches(req.password(), uOpt.get().getPasswordHash())) {
      return ResponseEntity.status(401).body(new ApiError("Invalid credentials"));
    }
    var u = uOpt.get();
    String token = jwt.issueToken(u.getId(), u.getEmail(), u.getRole().name());
    return ResponseEntity.ok(new AuthResponse(token, u.getEmail(), u.getRole().name()));
  }

  public record RegisterRequest(String name, @Email @NotBlank String email, @NotBlank @jakarta.validation.constraints.Size(min=8) String password) {}
  public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
  public record AuthResponse(String accessToken, String email, String role) {}
  public record ApiError(String message) {}
}
