import QueryBuilder from "../../builder/QueryBuilder.js";

import ApiError from "../../shared/ApiError.js";
import HTTP_STATUS from "../../constants/httpStatus.js";

import { User } from "./user.model.js";

import { USER_SORT_FIELDS, } from "./user.constants.js";
import { USER_MESSAGES } from "./user.constants.js";
import { sanitizeUser } from "./user.utils.js";

import findByPublicId from "../../shared/findByPublicId.js";

const getUsers = async (query) => {
  const queryBuilder =
    new QueryBuilder(
      User.find(),
      query
    )
      .search(["name", "email"])
      .filter()
      .sort(USER_SORT_FIELDS)
      .paginate()
      .fields();

  const data = await queryBuilder.modelQuery;

  const meta = await queryBuilder.countTotal();

  return {
    meta,
    data,
  };
};

// const getUser = async (publicId) => {
//   const user = await User.findOne({
//     publicId,
//   });

//   if (!user) {
//     throw new ApiError(
//       HTTP_STATUS.NOT_FOUND,
//       USER_MESSAGES.USER_NOT_FOUND
//     );
//   }

//   return sanitizeUser(user);
// };

const getUser = async (publicId) => {
  const user = await findByPublicId(
    User,
    publicId,
    USER_MESSAGES.USER_NOT_FOUND
  );

  return sanitizeUser(user);
};


export const UserService = {
  getUsers,
  getUser,
};




// import PAGINATION from "../../constants/pagination.js";

// import { User } from "./user.model.js";

// const getUsers = async (query) => {
//     const page =
//         Number(query.page) ||
//         PAGINATION.DEFAULT_PAGE;

//     const limit = Math.min(
//         Number(query.limit) ||
//         PAGINATION.DEFAULT_LIMIT,
//         PAGINATION.MAX_LIMIT
//     );

//     const skip = (page - 1) * limit;

//     const sortBy =
//         query.sortBy ||
//         PAGINATION.DEFAULT_SORT_BY;

//     const sortOrder =
//         query.sortOrder === "asc"
//             ? 1
//             : -1;

//     const filter = {};

//     if (query.search) {
//         filter.$or = [
//             {
//                 name: {
//                     $regex: query.search,
//                     $options: "i",
//                 },
//             },
//             {
//                 email: {
//                     $regex: query.search,
//                     $options: "i",
//                 },
//             },
//         ];
//     }

//     const users =
//         await User.find(filter).select(
//             "-password -__v"
//         )
//             .sort({
//                 [sortBy]: sortOrder,
//             })
//             .skip(skip)
//             .limit(limit);

//     const total =
//         await User.countDocuments(filter);

//     return {
//         meta: {
//             page,
//             limit,
//             total,
//             totalPages: Math.ceil(
//                 total / limit
//             ),
//         },

//         data: users,
//     };
// };

// export const UserService = {
//     getUsers,
// };