package com.example.collabboard.api;

import com.example.collabboard.domain.*;
import com.example.collabboard.repo.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.transaction.Transactional;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bootstrap")
@RequiredArgsConstructor
public class BootstrapController {
  private final WorkspaceRepo workspaces;
  private final BoardRepo boards;
  private final ColumnRepo columns;

  @PostMapping("/default")
  @Transactional
  public BootstrapResponse ensureDefault(HttpServletRequest req) {
    Long userId = (Long) req.getAttribute("userId");
    Workspace workspace = workspaces.findFirstByOwnerUserIdOrderByIdAsc(userId)
        .orElseGet(() -> workspaces.save(Workspace.builder()
            .name("My Workspace")
            .ownerUserId(userId)
            .build()));

    List<Board> existing = boards.findByWorkspaceIdOrderByIdAsc(workspace.getId());
    Board board;
    if (existing.isEmpty()) {
      board = boards.save(Board.builder()
          .workspaceId(workspace.getId())
          .name("Product Launch")
          .build());
      columns.saveAll(List.of(
          BoardColumn.builder().boardId(board.getId()).title("Backlog").position(0).build(),
          BoardColumn.builder().boardId(board.getId()).title("In progress").position(1).build(),
          BoardColumn.builder().boardId(board.getId()).title("Review").position(2).build(),
          BoardColumn.builder().boardId(board.getId()).title("Done").position(3).build()));
    } else {
      board = existing.get(0);
    }
    return new BootstrapResponse(workspace, board);
  }

  public record BootstrapResponse(Workspace workspace, Board board) {}
}
