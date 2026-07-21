package com.storepro.user.repository;

import com.storepro.user.entity.User;
import com.storepro.user.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    Optional<User> findByPasswordResetToken(String token);

    @Query(value = "SELECT u.* FROM users u WHERE " +
           "(:search IS NULL OR unaccent(lower(u.name)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "OR unaccent(lower(u.email)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%') " +
           "AND (cast(cast(:role as text) as varchar) IS NULL OR u.role = cast(cast(:role as text) as varchar)) " +
           "AND (cast(:active as boolean) IS NULL OR u.active = :active) " +
           "ORDER BY u.name",
           countQuery = "SELECT count(*) FROM users u WHERE " +
           "(:search IS NULL OR unaccent(lower(u.name)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%' " +
           "OR unaccent(lower(u.email)) LIKE '%' || unaccent(lower(cast(:search as text))) || '%') " +
           "AND (cast(cast(:role as text) as varchar) IS NULL OR u.role = cast(cast(:role as text) as varchar)) " +
           "AND (cast(:active as boolean) IS NULL OR u.active = :active)",
           nativeQuery = true)
    Page<User> findWithFilters(
            @Param("search") String search,
            @Param("role") Role role,
            @Param("active") Boolean active,
            Pageable pageable
    );
}
