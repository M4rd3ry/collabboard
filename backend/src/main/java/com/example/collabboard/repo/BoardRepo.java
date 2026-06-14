package com.example.collabboard.repo;

import com.example.collabboard.domain.Board;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardRepo extends JpaRepository<Board, Long> {
  List<Board> findByWorkspaceIdOrderByIdAsc(Long workspaceId);
  long countByWorkspaceId(Long workspaceId);
  void deleteByWorkspaceId(Long workspaceId);
}
