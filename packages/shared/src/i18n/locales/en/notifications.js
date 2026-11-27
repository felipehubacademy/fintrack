// notifications strings (en). Keys are referenced as t('notifications.<key>').
export default {
  billDue: {
    title: 'Bill coming up',
    body_one: '{{name}} is due in {{count}} day ({{amount}})',
    body_other: '{{name}} is due in {{count}} days ({{amount}})',
  },
  budgetAlert: {
    title: 'Budget heads-up',
    body: 'You\'ve already used {{percent}} of your {{category}} budget',
  },
};
