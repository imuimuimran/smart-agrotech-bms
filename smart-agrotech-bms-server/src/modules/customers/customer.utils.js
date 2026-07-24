import Customer from "./customer.model.js";

export const generateCustomerPublicId =
  async () => {
    const lastCustomer =
      await Customer.findOne()
        .sort({
          createdAt: -1,
        })
        .select("publicId")
        .setOptions({ skipDeletedCheck: true });;

    if (!lastCustomer) {
      return "CUS-100001";
    }

    const lastNumber =
      Number(
        lastCustomer.publicId.replace(
          "CUS-",
          ""
        )
      );

    return `CUS-${String(
      lastNumber + 1
    ).padStart(6, "0")}`;
  };

  export const sanitizeCustomer =
  (customer) => ({
    publicId:
      customer.publicId,

    name:
      customer.name,

    email:
      customer.email,

    phone:
      customer.phone,

    companyName:
      customer.companyName,

    customerType:
      customer.customerType,

    creditLimit:
      customer.creditLimit,

    currentBalance:
      customer.currentBalance,

    membershipLevel:
      customer.membershipLevel,

    status:
      customer.status,

    billingAddress:
      customer.billingAddress,

    shippingAddresses:
      customer.shippingAddresses,

    createdAt:
      customer.createdAt,

    updatedAt:
      customer.updatedAt,
  });

  export const normalizePhoneNumber = (phone) => {
  if (!phone) return "";
  
  // Strip out all spaces, dashes, parentheses, or dots
  let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");

  // If it starts with international prefix +880 or 880, normalize it to starting with 0
  if (cleaned.startsWith("+880")) {
    cleaned = "0" + cleaned.slice(4);
  } else if (cleaned.startsWith("880")) {
    cleaned = "0" + cleaned.slice(3);
  }

  return cleaned;
};

  export const CUSTOMER_SEARCHABLE_FIELDS = [
  "name",
  "phone",
  "email",
  "companyName",
];