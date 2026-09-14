package com.storepro.terminal.entity;

public enum TerminalPaymentStatus {
    /** Criada pelo PDV, aguardando a maquininha buscar. */
    PENDENTE,
    /** A maquininha assumiu a ordem e está com o cliente. */
    ENVIADO,
    APROVADO,
    RECUSADO,
    /** Cancelada pelo operador no PDV ou na maquininha. */
    CANCELADO,
    /** A maquininha não respondeu dentro do prazo. */
    EXPIRADO;

    public boolean isFinal() {
        return this == APROVADO || this == RECUSADO || this == CANCELADO || this == EXPIRADO;
    }
}
