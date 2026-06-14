package com.example.collabboard.api;

import com.example.collabboard.domain.BoardColumn;
import com.example.collabboard.repo.*;
import com.example.collabboard.service.AccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/columns") @RequiredArgsConstructor
public class ColumnController {
  private final ColumnRepo columns; private final CardRepo cards; private final AccessService access;
  @PostMapping @ResponseStatus(HttpStatus.CREATED)
  public BoardColumn create(HttpServletRequest req, @Valid @RequestBody CreateColumn body) {
    access.board(body.boardId(), userId(req));
    return columns.save(BoardColumn.builder().boardId(body.boardId()).title(body.title().trim()).position(body.position()).build());
  }
  @PatchMapping("/{id}") public BoardColumn update(HttpServletRequest req, @PathVariable Long id, @Valid @RequestBody UpdateColumn body) {
    BoardColumn c=access.column(id,userId(req)); c.setTitle(body.title().trim()); c.setPosition(body.position()); return columns.save(c);
  }
  @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) @Transactional
  public void delete(HttpServletRequest req,@PathVariable Long id) { access.column(id,userId(req)); cards.deleteByColumnId(id); columns.deleteById(id); }
  private Long userId(HttpServletRequest req){return (Long)req.getAttribute("userId");}
  public record CreateColumn(@NotNull Long boardId,@NotBlank @Size(max=60) String title,@Min(0) int position){}
  public record UpdateColumn(@NotBlank @Size(max=60) String title,@Min(0) int position){}
}
