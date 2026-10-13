package com.storepro;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableJpaAuditing
@EnableScheduling
public class StoreProApplication {

    public static void main(String[] args) {
        // A loja opera no horario de Brasilia. Sem isto a JVM herda o fuso do
        // servidor (UTC no Railway) e "hoje" vira o dia seguinte depois das 21h.
        // O driver do Postgres tambem usa este fuso na sessao.
        TimeZone.setDefault(TimeZone.getTimeZone("America/Sao_Paulo"));
        SpringApplication.run(StoreProApplication.class, args);
    }
}
