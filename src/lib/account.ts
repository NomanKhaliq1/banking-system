export const generateAccountNumber = () => {
  const prefix = "77";
  const random = Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
  return `${prefix}${random}`;
};
