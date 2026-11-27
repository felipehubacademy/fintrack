// notifications strings (es). Keys are referenced as t('notifications.<key>').
export default {
  billDue: {
    title: 'Cuenta por vencer',
    body_one: '{{name}} vence en {{count}} día ({{amount}})',
    body_other: '{{name}} vence en {{count}} días ({{amount}})',
  },
  budgetAlert: {
    title: 'Aviso de presupuesto',
    body: 'Ya usaste {{percent}} de tu presupuesto de {{category}}',
  },
};
