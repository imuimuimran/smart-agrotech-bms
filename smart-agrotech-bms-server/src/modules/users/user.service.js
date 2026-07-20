import PAGINATION from "../../constants/pagination.js";

import { User } from "./user.model.js";

const getUsers = async (query) => {
    const page =
        Number(query.page) ||
        PAGINATION.DEFAULT_PAGE;

    const limit = Math.min(
        Number(query.limit) ||
        PAGINATION.DEFAULT_LIMIT,
        PAGINATION.MAX_LIMIT
    );

    const skip = (page - 1) * limit;

    const sortBy =
        query.sortBy ||
        PAGINATION.DEFAULT_SORT_BY;

    const sortOrder =
        query.sortOrder === "asc"
            ? 1
            : -1;

    const filter = {};

    if (query.search) {
        filter.$or = [
            {
                name: {
                    $regex: query.search,
                    $options: "i",
                },
            },
            {
                email: {
                    $regex: query.search,
                    $options: "i",
                },
            },
        ];
    }

    const users =
        await User.find(filter).select(
            "-password -__v"
        )
            .sort({
                [sortBy]: sortOrder,
            })
            .skip(skip)
            .limit(limit);

    const total =
        await User.countDocuments(filter);

    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(
                total / limit
            ),
        },

        data: users,
    };
};

export const UserService = {
    getUsers,
};