package com.example.collabboard.api;

import com.example.collabboard.domain.*;
import com.example.collabboard.repo.*;
import com.example.collabboard.service.AccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/boards")
@RequiredArgsConstructor
public class BoardController {
  private final BoardRepo boards; private final ColumnRepo cols; private final CardRepo cards; private final AccessService access;
  @GetMapping public List<Board> list(HttpServletRequest req, @RequestParam Long workspaceId) {
    access.workspace(workspaceId, userId(req)); return boards.findByWorkspaceIdOrderByIdAsc(workspaceId);
  }
  @PostMapping @ResponseStatus(HttpStatus.CREATED) @Transactional
  public Board create(HttpServletRequest request, @Valid @RequestBody CreateBoard req) {
    access.workspace(req.workspaceId(), userId(request));
    Board b = boards.save(Board.builder().workspaceId(req.workspaceId()).name(req.name().trim()).build());
    cols.saveAll(List.of(
      BoardColumn.builder().boardId(b.getId()).title("Backlog").position(0).build(),
      BoardColumn.builder().boardId(b.getId()).title("In progress").position(1).build(),
      BoardColumn.builder().boardId(b.getId()).title("Review").position(2).build(),
      BoardColumn.builder().boardId(b.getId()).title("Done").position(3).build()));
    return b;
  }
  @GetMapping("/{boardId}/snapshot") public Snapshot snapshot(HttpServletRequest req, @PathVariable Long boardId) {
    Board board = access.board(boardId, userId(req));
    return new Snapshot(board, cols.findByBoardIdOrderByPositionAsc(boardId), cards.findByBoardIdOrderByColumnIdAscPositionAsc(boardId));
  }
  @PatchMapping("/{id}") public Board rename(HttpServletRequest req, @PathVariable Long id, @Valid @RequestBody RenameBoard body) {
    Board b = access.board(id, userId(req)); b.setName(body.name().trim()); return boards.save(b);
  }
  @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
  public void delete(HttpServletRequest req, @PathVariable Long id) {
    access.board(id, userId(req)); cards.deleteByBoardId(id); cols.deleteByBoardId(id); boards.deleteById(id);
  }
  private Long userId(HttpServletRequest req) { return (Long) req.getAttribute("userId"); }
  public record CreateBoard(@NotNull Long workspaceId, @NotBlank @Size(max=80) String name) {}
  public record RenameBoard(@NotBlank @Size(max=80) String name) {}
  public record Snapshot(Board board, List<BoardColumn> columns, List<Card> cards) {}
}
