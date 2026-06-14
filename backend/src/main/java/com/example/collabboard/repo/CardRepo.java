package com.example.collabboard.repo;
import com.example.collabboard.domain.Card;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
public interface CardRepo extends JpaRepository<Card, Long> {
  List<Card> findByBoardIdOrderByColumnIdAscPositionAsc(Long boardId);
  long countByBoardId(Long boardId);
  void deleteByBoardId(Long boardId);
  void deleteByColumnId(Long columnId);
}
