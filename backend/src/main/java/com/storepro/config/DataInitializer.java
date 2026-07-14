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
        // Migrate old admin user if exists
        userRepository.findByEmail("admin@storepro.com").ifPresent(oldAdmin -> {
            oldAdmin.setEmail("danilo");
            oldAdmin.setName("Danilo");
            oldAdmin.setPassword(passwordEncoder.encode("danilo"));
            userRepository.save(oldAdmin);
            log.info("✅ Credenciais do admin migradas para: danilo / danilo");
        });

        if (userRepository.findByEmail("danilo").isEmpty()) {
            User admin = User.builder()
                    .name("Danilo")
                    .email("danilo")
                    .password(passwordEncoder.encode("danilo"))
                    .role(Role.ADMIN)
                    .active(true)
                    .build();
            admin.setCreatedBy("SYSTEM");
            userRepository.save(admin);
            log.info("✅ Usuário admin criado: danilo / danilo");
        } else {
            log.info("✅ Usuário admin já existe");
        }
    }
}
