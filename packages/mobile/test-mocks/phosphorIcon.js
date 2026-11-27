// Jest stand-in for deep phosphor icon imports
// (e.g. 'phosphor-react-native/lib/module/icons/ForkKnife').
// Every named export is a lightweight function component.
module.exports = new Proxy(
  {},
  {
    get: (_, name) => {
      if (name === '__esModule') return true;
      const Icon = () => `${String(name)}Icon`;
      Icon.displayName = String(name);
      return Icon;
    },
  }
);
