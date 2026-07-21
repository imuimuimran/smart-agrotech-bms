import mongoose from "mongoose";

import addressSchema from "../../shared/schemas/address.schema.js";

import USER_STATUS from "../../constants/userStatus.js";

const customerSchema = new mongoose.Schema(
    {
        publicId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },

        name: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        email: {
            type: String,
            lowercase: true,
            trim: true,
            sparse: true,
            unique: true,
        },

        phone: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        companyName: {
            type: String,
            trim: true,
            default: "",
            index: true,
        },

        companyType: {
            type: String,
            default: "",
            trim: true,
        },

        customerType: {
            type: String,
            enum: [
                "individual",
                "business",
                "wholesale",
                "retail",
            ],
            default: "individual",
            index: true,
        },

        taxNumber: {
            type: String,
            default: "",
            trim: true,
        },

        tradeLicense: {
            type: String,
            default: "",
            trim: true,
        },

        billingAddress: {
            type: addressSchema,
            required: true,
        },

        shippingAddresses: {
            type: [addressSchema],
            default: [],
        },

        creditLimit: {
            type: Number,
            default: 0,
            min: 0,
        },

        openingBalance: {
            type: Number,
            default: 0,
        },

        currentBalance: {
            type: Number,
            default: 0,
        },

        paymentTerms: {
            type: String,
            default: "Cash",
        },

        currency: {
            type: String,
            default: "BDT",
        },

        totalOrders: {
            type: Number,
            default: 0,
        },

        totalPurchases: {
            type: Number,
            default: 0,
        },

        totalReturnedAmount: {
            type: Number,
            default: 0,
        },

        loyaltyPoints: {
            type: Number,
            default: 0,
        },

        membershipLevel: {
            type: String,
            default: "Bronze",
        },

        status: {
            type: String,
            enum: [
                USER_STATUS.ACTIVE,
                USER_STATUS.INACTIVE,
            ],
            default: USER_STATUS.ACTIVE,
            index: true,
        },

        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },

        deletedAt: {
            type: Date,
            default: null,
        },

        createdBy: {
            type: String,
            required: true,
        },

        updatedBy: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

customerSchema.pre(/^find/, function (next) {
    this.find({
        isDeleted: false,
    });

    next();
});

customerSchema.index({
    name: "text",
    companyName: "text",
});

const Customer = mongoose.model(
    "Customer",
    customerSchema
);

export default Customer;