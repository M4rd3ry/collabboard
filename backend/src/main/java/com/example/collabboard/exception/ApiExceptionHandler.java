package com.example.collabboard.exception;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(NotFoundException.class)
  ResponseEntity<?> notFound(NotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error(ex.getMessage()));
  }
  @ExceptionHandler(MethodArgumentNotValidException.class)
  ResponseEntity<?> validation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .findFirst().map(e -> e.getField() + ": " + e.getDefaultMessage()).orElse("Validation failed");
    return ResponseEntity.badRequest().body(error(message));
  }
  @ExceptionHandler(Exception.class)
  ResponseEntity<?> generic(Exception ex) {
    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error("Unexpected server error"));
  }
  private Map<String,Object> error(String message) {
    return Map.of("message", message, "timestamp", Instant.now().toString());
  }
}
