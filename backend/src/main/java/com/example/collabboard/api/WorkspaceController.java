package com.example.collabboard.api;

import com.example.collabboard.domain.*;
import com.example.collabboard.repo.*;
import com.example.collabboard.service.AccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/workspaces")
@RequiredArgsConstructor
public class WorkspaceController {
  private final WorkspaceRepo workspaces;
  private final BoardRepo boards;
  private final ColumnRepo columns;
  private final CardRepo cards;
  private final AccessService access;

  @GetMapping
  public List<Workspace> my(HttpServletRequest req) {
    return workspaces.findByOwnerUserIdOrderByIdAsc(userId(req));
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public Workspace create(HttpServletRequest req, @Valid @RequestBody WorkspaceRequest body) {
    return workspaces.save(Workspace.builder()
        .name(body.name().trim())
        .ownerUserId(userId(req))
        .build());
  }

  @PatchMapping("/{id}")
  public Workspace rename(HttpServletRequest req, @PathVariable Long id,
      @Valid @RequestBody WorkspaceRequest body) {
    Workspace w = access.workspace(id, userId(req));
    w.setName(body.name().trim());
    return workspaces.save(w);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  @Transactional
  public void delete(HttpServletRequest req, @PathVariable Long id) {
    access.workspace(id, userId(req));
    for (Board board : boards.findByWorkspaceIdOrderByIdAsc(id)) {
      cards.deleteByBoardId(board.getId());
      columns.deleteByBoardId(board.getId());
    }
    boards.deleteByWorkspaceId(id);
    workspaces.deleteById(id);
  }

  private Long userId(HttpServletRequest req) {
    return (Long) req.getAttribute("userId");
  }

  public record WorkspaceRequest(@NotBlank @Size(max = 80) String name) {}
}
