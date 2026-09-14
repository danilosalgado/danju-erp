package com.storepro.terminal.repository;

import com.storepro.terminal.entity.TerminalPayment;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TerminalPaymentRepository extends JpaRepository<TerminalPayment, UUID> {

    @Query("SELECT t FROM TerminalPayment t WHERE t.terminalId = :terminalId " +
           "AND t.status = com.storepro.terminal.entity.TerminalPaymentStatus.PENDENTE " +
           "AND t.expiresAt > :now ORDER BY t.createdAt ASC")
    List<TerminalPayment> findNextPending(@Param("terminalId") String terminalId,
                                          @Param("now") LocalDateTime now,
                                          Pageable pageable);

    /**
     * Fecha ordens que ficaram para trás — a maquininha desligou, perdeu rede ou o
     * operador abandonou a tela. Sem isso o app buscaria uma cobrança de ontem e
     * passaria o cartão do cliente errado.
     */
    @Modifying
    @Query("UPDATE TerminalPayment t SET t.status = com.storepro.terminal.entity.TerminalPaymentStatus.EXPIRADO, " +
           "t.finishedAt = :now, t.errorMessage = 'Tempo esgotado sem resposta da maquininha' " +
           "WHERE t.status IN (com.storepro.terminal.entity.TerminalPaymentStatus.PENDENTE, " +
           "com.storepro.terminal.entity.TerminalPaymentStatus.ENVIADO) AND t.expiresAt <= :now")
    int expireStale(@Param("now") LocalDateTime now);

    /** O webhook do PagBank identifica o pagamento pelo id do pedido deles. */
    Optional<TerminalPayment> findByProviderOrderId(String providerOrderId);
}
