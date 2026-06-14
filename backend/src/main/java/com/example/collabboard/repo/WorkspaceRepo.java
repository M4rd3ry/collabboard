package com.example.collabboard.repo;

import com.example.collabboard.domain.Workspace;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkspaceRepo extends JpaRepository<Workspace, Long> {
  List<Workspace> findByOwnerUserIdOrderByIdAsc(Long ownerUserId);
  Optional<Workspace> findByIdAndOwnerUserId(Long id, Long ownerUserId);
  Optional<Workspace> findFirstByOwnerUserIdOrderByIdAsc(Long ownerUserId);
}
