package com.example.collabboard.api;

import com.example.collabboard.domain.*;
import com.example.collabboard.exception.NotFoundException;
import com.example.collabboard.repo.CardRepo;
import com.example.collabboard.service.AccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
public class CardController {
  private final CardRepo repo;
  private final AccessService access;

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Card create(HttpServletRequest request, @Valid @RequestBody CardRequest req) {
    access.board(req.boardId(), userId(request));
    BoardColumn column = access.column(req.columnId(), userId(request));
    requireSameBoard(req.boardId(), column);
    Card c = repo.save(Card.builder()
        .boardId(req.boardId()).columnId(req.columnId()).title(req.title().trim())
        .description(clean(req.description())).priority(req.priority() == null ? Priority.MEDIUM : req.priority())
        .assignee(clean(req.assignee())).dueDate(req.dueDate()).label(clean(req.label()))
        .position(req.position()).build());
    return c;
  }

  @PatchMapping("/{id}")
  public Card update(HttpServletRequest request, @PathVariable Long id, @Valid @RequestBody CardRequest req) {
    Card c = access.card(id, userId(request));
    if (!c.getBoardId().equals(req.boardId())) throw new NotFoundException("Card does not belong to this board");
    BoardColumn column = access.column(req.columnId(), userId(request));
    requireSameBoard(c.getBoardId(), column);
    c.setColumnId(req.columnId());
    c.setTitle(req.title().trim());
    c.setDescription(clean(req.description()));
    c.setPriority(req.priority() == null ? Priority.MEDIUM : req.priority());
    c.setAssignee(clean(req.assignee()));
    c.setDueDate(req.dueDate());
    c.setLabel(clean(req.label()));
    c.setPosition(req.position());
    Card saved = repo.save(c);
    return saved;
  }

  @PatchMapping("/{id}/move")
  public Card move(HttpServletRequest request, @PathVariable Long id, @Valid @RequestBody MoveCard req) {
    Card c = access.card(id, userId(request));
    BoardColumn column = access.column(req.columnId(), userId(request));
    requireSameBoard(c.getBoardId(), column);
    c.setColumnId(req.columnId());
    c.setPosition(req.position());
    Card saved = repo.save(c);
    return saved;
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(HttpServletRequest request, @PathVariable Long id) {
    Card c = access.card(id, userId(request));
    repo.delete(c);
  }

  private void requireSameBoard(Long boardId, BoardColumn column) {
    if (!column.getBoardId().equals(boardId)) throw new NotFoundException("Column does not belong to this board");
  }

  private String clean(String value) {
    if (value == null) return null;
    String trimmed = value.trim();
    return trimmed.isEmpty() ? null : trimmed;
  }

  private Long userId(HttpServletRequest req) { return (Long) req.getAttribute("userId"); }

  public record CardRequest(@NotNull Long boardId, @NotNull Long columnId,
      @NotBlank @Size(max = 140) String title, @Size(max = 2000) String description,
      Priority priority, @Size(max = 80) String assignee, LocalDate dueDate,
      @Size(max = 40) String label, @Min(0) int position) {}
  public record MoveCard(@NotNull Long columnId, @Min(0) int position) {}
}
