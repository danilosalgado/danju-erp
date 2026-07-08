package com.storepro.config;

import com.storepro.user.entity.Role;
import com.storepro.user.entity.User;
import com.storepro.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.findByEmail("admin@storepro.com").isEmpty()) {
            User admin = User.builder()
                    .name("Administrador")
                    .email("admin@storepro.com")
                    .password(passwordEncoder.encode("admin123"))
                    .role(Role.ADMIN)
                    .active(true)
                    .build();
            admin.setCreatedBy("SYSTEM");
            userRepository.save(admin);
            log.info("✅ Usuário admin criado com sucesso: admin@storepro.com / admin123");
        } else {
            // Update password to ensure it's correct
            userRepository.findByEmail("admin@storepro.com").ifPresent(admin -> {
                if (!passwordEncoder.matches("admin123", admin.getPassword())) {
                    admin.setPassword(passwordEncoder.encode("admin123"));
                    userRepository.save(admin);
                    log.info("✅ Senha do admin atualizada para: admin123");
                } else {
                    log.info("✅ Usuário admin já existe com senha correta");
                }
            });
        }
    }
}
