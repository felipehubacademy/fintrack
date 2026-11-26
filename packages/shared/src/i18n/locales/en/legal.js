// legal strings (en). Keys are referenced as t('legal.<key>').
// Long texts are arrays of sections: { title, body?: [], items?: [], after?: [] }.
// Placeholders filled by the page: {{controller}}, {{email}}, {{contactEmail}}, {{deleteUrl}}.
// NOTE: must be reviewed by a lawyer before launch.
export default {
  lastUpdated: 'Last updated: {{date}}',
  updatedDate: 'November 26, 2026',
  otherLanguages: 'Also available in',
  onThisPage: 'On this page',
  privacy: {
    metaTitle: 'Privacy Policy | MeuAzulão',
    metaDescription: 'What data MeuAzulão collects, why, who processes it and how to delete it.',
    badge: 'Privacy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy',
    intro: 'MeuAzulão helps you track your money by chatting with Zul on WhatsApp. This policy explains, in plain words, what we collect, why, who helps us process it, and how you stay in control. We wrote it to comply with Brazil’s General Data Protection Law (LGPD, Law 13,709/2018) and the privacy laws of the countries where we operate.',
    sections: [
      {
        title: '1. Who is responsible for your data',
        body: [
          'MeuAzulão is operated by {{controller}}, the data controller for the personal data described here.',
          'For anything about your data, write to our Data Protection Officer at {{email}}.',
        ],
      },
      {
        title: '2. What we collect',
        items: [
          'Account data: your phone number (WhatsApp), your name and, if you give it, your email.',
          'What you tell us: transactions and other financial notes you type or say to Zul or enter in the app, such as amounts, descriptions, categories, card and account names, bills, budgets and goals.',
          'Audio messages and photos (for example, receipts) you send to Zul. We process them to understand the transaction and then discard them within 30 days.',
          'Usage and crash data: app and device version, error reports, access logs and IP address, used to keep the service working and secure.',
        ],
        after: [
          'We never ask for your bank passwords or full card numbers, and we don’t need them. Please don’t send them to Zul.',
        ],
      },
      {
        title: '3. Why we use it (and the legal basis)',
        items: [
          'To provide the service you signed up for: log your transactions, answer you on WhatsApp, show your dashboard, send the reminders and summaries you asked for. Legal basis: performance of a contract (LGPD, Art. 7, V).',
          'To keep the service secure, prevent abuse and fix errors. Legal basis: performance of a contract and our legitimate interest (Art. 7, IX).',
          'To comply with legal obligations and requests from authorities (Art. 7, II).',
        ],
        after: [
          'We do not use your data for advertising, we have no ad trackers, and we never sell your data.',
        ],
      },
      {
        title: '4. Who processes your data for us',
        body: ['We use a few service providers, under contracts that only let them process your data to run MeuAzulão:'],
        items: [
          'Meta (WhatsApp Business Platform): delivers messages between you and Zul.',
          'OpenAI (via API): understands your messages, audio and photos. Data sent through the API is not used to train OpenAI models.',
          'Supabase: our database, hosted in the São Paulo (Brazil) region, encrypted in transit and at rest.',
          'Vercel: hosts our website and servers.',
          'Sentry: receives error and crash reports so we can fix problems.',
          'Twilio SendGrid: sends account emails, such as invitations, when you use email.',
        ],
        after: [
          'In a shared (family) account, the members you invite can see the organization’s shared financial data.',
          'We may disclose data when required by law or by a court order.',
        ],
      },
      {
        title: '5. International transfers',
        body: [
          'Some providers (such as Meta, OpenAI, Vercel and Sentry) may process data outside Brazil, including in the United States. These transfers follow Art. 33 of the LGPD, based on standard contractual clauses and equivalent data protection commitments.',
        ],
      },
      {
        title: '6. How long we keep it',
        items: [
          'Account and financial data: while your account is active.',
          'Audio messages and photos: discarded within 30 days after processing.',
          'Logs and error reports: up to 90 days.',
          'When you delete your account, your data is deleted right away; copies in backups are erased within 30 days. We keep only what the law requires us to keep, for the time it requires.',
        ],
      },
      {
        title: '7. Your rights',
        body: ['You can, at any time and free of charge:'],
        items: [
          'Confirm whether we process your data and access it.',
          'Correct incomplete, inaccurate or outdated data.',
          'Get a copy of your data in a structured format (portability).',
          'Ask us to anonymize, block or delete unnecessary or excessive data.',
          'Delete your account and your data.',
          'Know with whom we share your data.',
          'Object to processing and withdraw any consent you gave.',
        ],
        after: [
          'To exercise any of these rights, write to {{email}}. We reply within 15 days. You can also file a complaint with Brazil’s data protection authority (ANPD) or the authority in your country.',
        ],
      },
      {
        title: '8. Deleting your account',
        body: [
          'You can delete your account in the app (Settings > Delete account), by sending “delete my account” to Zul on WhatsApp, or on the web at {{deleteUrl}}. Deletion is immediate and covers all your data.',
        ],
      },
      {
        title: '9. Security',
        items: [
          'Encryption in transit (TLS/HTTPS) and at rest.',
          'Row-level security in the database, so each person only reaches their own data.',
          'Sign-in with a one-time code sent on WhatsApp.',
          'Access controls by organization and role, and automatic backups.',
        ],
      },
      {
        title: '10. Children',
        body: ['MeuAzulão is for people 18 and older. We do not knowingly collect data from children.'],
      },
      {
        title: '11. Cookies',
        body: [
          'We only use what is strictly necessary to keep you signed in and remember your preferences (such as language). No advertising or third-party tracking cookies.',
        ],
      },
      {
        title: '12. Changes to this policy',
        body: [
          'If we make important changes, we will tell you on WhatsApp, by email or in the app before they take effect. The date at the top shows the latest version.',
        ],
      },
      {
        title: '13. Contact',
        body: [
          'Data controller: {{controller}}.',
          'Data Protection Officer (Encarregado): {{email}}.',
        ],
      },
    ],
  },
  terms: {
    metaTitle: 'Terms of Service | MeuAzulão',
    metaDescription: 'The rules for using MeuAzulão and Zul, its WhatsApp assistant.',
    badge: 'Terms',
    title: 'Terms of Service',
    shortTitle: 'Terms',
    intro: 'These Terms govern your use of MeuAzulão, operated by {{controller}}. By creating an account or using the service, on WhatsApp, in the app or on the web, you agree to them. Please read them together with our Privacy Policy.',
    sections: [
      {
        title: '1. Who can use MeuAzulão',
        items: [
          'You are at least 18 years old and able to enter into a contract.',
          'The information you give us is true and up to date.',
          'You keep your phone, WhatsApp and sign-in codes secure. Anyone with access to your WhatsApp can talk to Zul as you.',
        ],
      },
      {
        title: '2. The service',
        body: ['MeuAzulão is a personal and family money tracker. You can:'],
        items: [
          'Log expenses and income by chatting with Zul on WhatsApp (text, audio or photos), in the app or on the web.',
          'See summaries, charts and your month at a glance.',
          'Get the reminders and alerts you choose, such as bills due and budgets.',
          'Share an account with your family, with roles for each member.',
        ],
        after: [
          'We may change, suspend or end features. When a change matters to you, we will let you know in advance whenever possible.',
        ],
      },
      {
        title: '3. Zul and artificial intelligence',
        items: [
          'Zul is an automated assistant powered by AI (OpenAI models via API). Zul is not a certified financial advisor and its answers are not financial, tax, legal or investment advice.',
          'AI can make mistakes. Check important numbers in your dashboard before making decisions.',
          'What you send to Zul is processed as described in the Privacy Policy. It is not used to train OpenAI models.',
        ],
      },
      {
        title: '4. Your account',
        items: [
          'You sign in with a code we send to your WhatsApp (or with email and password, if you set them up).',
          'You are responsible for what happens in your account. Tell us right away if you notice any unauthorized use.',
          'In a shared account, all members you invite can see the shared financial data. Admins manage members and their permissions.',
        ],
      },
      {
        title: '5. Fair use',
        body: ['You agree not to:'],
        items: [
          'Use MeuAzulão for anything illegal, or to violate anyone’s rights.',
          'Try to access other people’s data or parts of the service you are not allowed to.',
          'Send malware, spam, or abusive or illegal content to Zul.',
          'Disrupt, overload, copy, resell or reverse engineer the service.',
        ],
        after: ['If you break these rules, we may suspend or close your account.'],
      },
      {
        title: '6. Price: free early access',
        items: [
          'MeuAzulão is free during early access, until {{earlyAccessEnd}}.',
          'Before any paid plan starts, we will tell you in advance, with the price and what it includes. Nothing is charged automatically: you choose whether to subscribe.',
          'Paid plans bought through the App Store or Google Play follow those stores’ billing and cancellation rules.',
        ],
      },
      {
        title: '7. Intellectual property',
        body: [
          'The MeuAzulão brand, Zul, the software and the content of the service belong to {{controller}} or its licensors. We give you a personal, non-exclusive, non-transferable and revocable license to use the service under these Terms. Your financial data is yours.',
        ],
      },
      {
        title: '8. Privacy',
        body: [
          'How we handle your personal data is explained in our Privacy Policy, which is part of these Terms.',
        ],
      },
      {
        title: '9. Limits of our responsibility',
        items: [
          'MeuAzulão is an organization tool. We are not a bank or a financial institution, and we do not offer credit, investments or financial advice.',
          'We work hard to keep the service available and accurate, but it may have interruptions or errors.',
          'To the extent permitted by law, we are not liable for indirect damages or for decisions made solely based on Zul’s answers. Nothing in these Terms limits rights that consumer protection laws give you.',
        ],
      },
      {
        title: '10. Ending your account',
        items: [
          'You can delete your account at any time: in the app, by sending “delete my account” to Zul, or at {{deleteUrl}}.',
          'We may suspend or close accounts that break these Terms or put the service or other people at risk.',
          'After your account ends, your data is handled as described in the Privacy Policy.',
        ],
      },
      {
        title: '11. Governing law',
        body: [
          'These Terms are governed by the laws of Brazil, including the Consumer Protection Code (Law 8,078/1990), the Brazilian Internet Bill of Rights (Law 12,965/2014) and the LGPD. Disputes are handled in the courts of the consumer’s domicile. If you live outside Brazil, the mandatory consumer protection rules of your country also apply.',
        ],
      },
      {
        title: '12. Changes to these Terms',
        body: [
          'If we change these Terms in a way that matters, we will tell you in advance on WhatsApp, by email or in the app. If you keep using MeuAzulão after the changes take effect, the new Terms apply.',
        ],
      },
      {
        title: '13. Contact',
        body: ['Questions about these Terms: {{contactEmail}}. Privacy questions: {{email}}.'],
      },
    ],
  },
};
