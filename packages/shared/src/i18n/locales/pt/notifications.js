// notifications strings (pt). Keys are referenced as t('notifications.<key>').
export default {
  billDue: {
    title: 'Conta chegando',
    body_one: '{{name}} vence em {{count}} dia ({{amount}})',
    body_other: '{{name}} vence em {{count}} dias ({{amount}})',
  },
  budgetAlert: {
    title: 'Alerta de orçamento',
    body: 'Você já usou {{percent}} do orçamento de {{category}}',
  },
};
