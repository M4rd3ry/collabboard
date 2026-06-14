package com.example.collabboard.domain;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="board_columns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BoardColumn {
  @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable=false)
  private Long boardId;

  @Column(nullable=false)
  private String title;

  @Column(nullable=false)
  private int position;
}
