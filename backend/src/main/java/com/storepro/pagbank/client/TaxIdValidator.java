package com.storepro.pagbank.client;

/**
 * Validação de CPF/CNPJ pelo dígito verificador.
 *
 * O PagBank confere o dígito e recusa a cobrança — testado com 000.000.000-00,
 * 111.111.111-11 e 123.456.789-00, todos rejeitados. Validar antes evita que o
 * caixa descubra o problema com o cliente esperando na frente dele, e faz o erro
 * apontar para o documento errado em vez de virar um 400 genérico do PagBank.
 */
public final class TaxIdValidator {

    private TaxIdValidator() {}

    public static String digitsOnly(String value) {
        return value == null ? "" : value.replaceAll("\\D", "");
    }

    public static boolean isValid(String value) {
        String digits = digitsOnly(value);
        return switch (digits.length()) {
            case 11 -> isValidCpf(digits);
            case 14 -> isValidCnpj(digits);
            default -> false;
        };
    }

    private static boolean isValidCpf(String cpf) {
        // Sequências repetidas passam na conta dos dígitos, mas não são CPF.
        if (cpf.chars().distinct().count() == 1) return false;

        int d1 = checkDigit(cpf, 9, 10);
        int d2 = checkDigit(cpf, 10, 11);
        return d1 == digitAt(cpf, 9) && d2 == digitAt(cpf, 10);
    }

    private static int checkDigit(String cpf, int length, int startWeight) {
        int sum = 0;
        for (int i = 0; i < length; i++) {
            sum += digitAt(cpf, i) * (startWeight - i);
        }
        int rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    }

    private static boolean isValidCnpj(String cnpj) {
        if (cnpj.chars().distinct().count() == 1) return false;

        int[] weights1 = {5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int[] weights2 = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        return cnpjDigit(cnpj, weights1) == digitAt(cnpj, 12)
                && cnpjDigit(cnpj, weights2) == digitAt(cnpj, 13);
    }

    private static int cnpjDigit(String cnpj, int[] weights) {
        int sum = 0;
        for (int i = 0; i < weights.length; i++) {
            sum += digitAt(cnpj, i) * weights[i];
        }
        int rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
    }

    private static int digitAt(String value, int index) {
        return value.charAt(index) - '0';
    }
}
