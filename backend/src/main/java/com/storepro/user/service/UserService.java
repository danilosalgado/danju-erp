package com.storepro.user.service;

import com.storepro.common.dto.PageResponse;
import com.storepro.common.exception.BusinessException;
import com.storepro.common.exception.ResourceNotFoundException;
import com.storepro.user.dto.CreateUserRequest;
import com.storepro.user.dto.UpdateUserRequest;
import com.storepro.user.dto.UserResponse;
import com.storepro.user.entity.Role;
import com.storepro.user.entity.User;
import com.storepro.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse create(CreateUserRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException("E-mail já cadastrado", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .active(true)
                .build();

        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserResponse getById(UUID id) {
        return toResponse(findById(id));
    }

    @Transactional(readOnly = true)
    public PageResponse<UserResponse> list(String search, Role role, Boolean active, int page, int size) {
        PageRequest pageRequest = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "name"));
        Page<User> userPage = userRepository.findWithFilters(search, role, active, pageRequest);

        return PageResponse.of(
                userPage.getContent().stream().map(this::toResponse).toList(),
                page,
                size,
                userPage.getTotalElements()
        );
    }

    @Transactional
    public UserResponse update(UUID id, UpdateUserRequest request) {
        User user = findById(id);

        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BusinessException("E-mail já cadastrado", HttpStatus.CONFLICT);
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPassword() != null) {
            user.setPassword(passwordEncoder.encode(request.getPassword()));
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }
        if (request.getActive() != null) {
            user.setActive(request.getActive());
        }

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public void delete(UUID id) {
        User user = findById(id);
        user.setActive(false);
        userRepository.save(user);
    }

    private User findById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", "id", id));
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .active(user.isActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
