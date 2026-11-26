// Jest mock for the RevenueCat SDK (used automatically for node_modules
// packages). Tests set return values per case, e.g.
//   Purchases.getCustomerInfo.mockResolvedValue(customerInfo)
const emptyCustomerInfo = () => ({
  entitlements: { active: {}, all: {} },
  activeSubscriptions: [],
  managementURL: null,
});

const Purchases = {
  configure: jest.fn(),
  isConfigured: jest.fn(async () => true),
  setLogLevel: jest.fn(async () => {}),
  logIn: jest.fn(async () => ({ customerInfo: emptyCustomerInfo(), created: false })),
  logOut: jest.fn(async () => emptyCustomerInfo()),
  getCustomerInfo: jest.fn(async () => emptyCustomerInfo()),
  getOfferings: jest.fn(async () => ({ current: null, all: {} })),
  purchasePackage: jest.fn(async () => ({ customerInfo: emptyCustomerInfo() })),
  purchaseDiscountedPackage: jest.fn(async () => ({ customerInfo: emptyCustomerInfo() })),
  purchaseSubscriptionOption: jest.fn(async () => ({ customerInfo: emptyCustomerInfo() })),
  getPromotionalOffer: jest.fn(async () => undefined),
  restorePurchases: jest.fn(async () => emptyCustomerInfo()),
  showManageSubscriptions: jest.fn(async () => {}),
  addCustomerInfoUpdateListener: jest.fn(),
  removeCustomerInfoUpdateListener: jest.fn(() => true),
  LOG_LEVEL: { VERBOSE: 'VERBOSE', DEBUG: 'DEBUG', INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: '1' },
};

module.exports = Purchases;
module.exports.default = Purchases;
module.exports.__emptyCustomerInfo = emptyCustomerInfo;
