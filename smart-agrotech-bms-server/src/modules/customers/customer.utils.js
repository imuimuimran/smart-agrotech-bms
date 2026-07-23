import Customer from "./customer.model.js";

export const generateCustomerPublicId =
  async () => {
    const lastCustomer =
      await Customer.findOne()
        .sort({
          createdAt: -1,
        })
        .select("publicId");

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

  export const searchableFields = [
  "name",
  "phone",
  "email",
  "companyName",
];