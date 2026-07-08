package com.storepro.auth;

import com.storepro.auth.dto.*;
import com.storepro.common.exception.BusinessException;
import com.storepro.user.entity.User;
import com.storepro.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        User user = (User) authentication.getPrincipal();

        if (!user.isActive()) {
            throw new BusinessException("Usuário inativo. Contate o administrador.", HttpStatus.FORBIDDEN);
        }

        String accessToken = tokenProvider.generateToken(user.getEmail());
        String refreshToken = tokenProvider.generateRefreshToken(user.getEmail());

        log.info("Login realizado: {}", user.getEmail());

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    public LoginResponse refreshToken(RefreshTokenRequest request) {
        if (!tokenProvider.validateToken(request.getRefreshToken())) {
            throw new BusinessException("Refresh token inválido ou expirado", HttpStatus.UNAUTHORIZED);
        }

        String email = tokenProvider.getEmailFromToken(request.getRefreshToken());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("Usuário não encontrado", HttpStatus.NOT_FOUND));

        String accessToken = tokenProvider.generateToken(email);
        String refreshToken = tokenProvider.generateRefreshToken(email);

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
            String token = UUID.randomUUID().toString();
            user.setPasswordResetToken(token);
            userRepository.save(user);
            log.info("Token de reset gerado para: {}", user.getEmail());
            // In production, send email with reset link
        });
        // Always return success to prevent email enumeration
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = userRepository.findByPasswordResetToken(request.getToken())
                .orElseThrow(() -> new BusinessException("Token inválido ou expirado", HttpStatus.BAD_REQUEST));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordResetToken(null);
        userRepository.save(user);

        log.info("Senha resetada para: {}", user.getEmail());
    }
}
