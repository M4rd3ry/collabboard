package com.example.collabboard.service;

import com.example.collabboard.domain.*;
import com.example.collabboard.exception.NotFoundException;
import com.example.collabboard.repo.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AccessService {
  private final WorkspaceRepo workspaces;
  private final BoardRepo boards;
  private final ColumnRepo columns;
  private final CardRepo cards;

  public Workspace workspace(Long id, Long userId) {
    return workspaces.findByIdAndOwnerUserId(id, userId)
        .orElseThrow(() -> new NotFoundException("Workspace not found"));
  }
  public Board board(Long id, Long userId) {
    Board board = boards.findById(id).orElseThrow(() -> new NotFoundException("Board not found"));
    workspace(board.getWorkspaceId(), userId);
    return board;
  }
  public BoardColumn column(Long id, Long userId) {
    BoardColumn column = columns.findById(id).orElseThrow(() -> new NotFoundException("Column not found"));
    board(column.getBoardId(), userId);
    return column;
  }
  public Card card(Long id, Long userId) {
    Card card = cards.findById(id).orElseThrow(() -> new NotFoundException("Card not found"));
    board(card.getBoardId(), userId);
    return card;
  }
}
