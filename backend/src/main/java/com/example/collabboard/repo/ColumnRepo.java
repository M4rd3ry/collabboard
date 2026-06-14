package com.example.collabboard.repo;

import com.example.collabboard.domain.BoardColumn;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ColumnRepo extends JpaRepository<BoardColumn, Long> {
  List<BoardColumn> findByBoardIdOrderByPositionAsc(Long boardId);
  void deleteByBoardId(Long boardId);
}
