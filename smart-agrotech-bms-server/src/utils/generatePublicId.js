const generatePublicId = (prefix) => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return `${prefix}-${timestamp}${random}`;
};

export default generatePublicId;