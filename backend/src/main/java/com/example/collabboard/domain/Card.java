package com.example.collabboard.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name="cards", indexes = {
    @Index(name="idx_card_board", columnList="boardId"),
    @Index(name="idx_card_column", columnList="columnId")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Card {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;
  @Column(nullable=false) private Long boardId;
  @Column(nullable=false) private Long columnId;
  @Column(nullable=false, length=140) private String title;
  @Column(length=2000) private String description;
  @Enumerated(EnumType.STRING) @Column(nullable=false) @Builder.Default
  private Priority priority = Priority.MEDIUM;
  private String assignee;
  private LocalDate dueDate;
  private String label;
  @Column(nullable=false) private int position;
  @CreationTimestamp @Column(nullable=false, updatable=false) private Instant createdAt;
  @UpdateTimestamp @Column(nullable=false) private Instant updatedAt;
}
