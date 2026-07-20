import PAGINATION from "../constants/pagination.js";

class QueryBuilder {
    constructor(modelQuery, query) {
        this.modelQuery = modelQuery;
        this.query = query;
    }

    search(searchableFields) {
        const search = this.query.search;

        if (search) {
            this.modelQuery = this.modelQuery.find({
                $or: searchableFields.map((field) => ({
                    [field]: {
                        $regex: search,
                        $options: "i",
                    },
                })),
            });
        }

        return this;
    }

    filter() {
        const queryObject = { ...this.query };

        const excludedFields = [
            "search",
            "page",
            "limit",
            "sortBy",
            "sortOrder",
            "fields",
        ];

        excludedFields.forEach((field) => {
            delete queryObject[field];
        });

        this.modelQuery =
            this.modelQuery.find(queryObject);

        return this;
    }

    //   sort() {
    //     const sortBy =
    //       this.query.sortBy ||
    //       PAGINATION.DEFAULT_SORT_BY;

    //     const sortOrder =
    //       this.query.sortOrder === "asc"
    //         ? ""
    //         : "-";

    //     this.modelQuery =
    //       this.modelQuery.sort(
    //         `${sortOrder}${sortBy}`
    //       );

    //     return this;
    //   }

    sort(allowedFields = []) {
        let sortBy =
            this.query.sortBy ||
            PAGINATION.DEFAULT_SORT_BY;

        if (
            allowedFields.length &&
            !allowedFields.includes(sortBy)
        ) {
            sortBy =
                PAGINATION.DEFAULT_SORT_BY;
        }

        const prefix =
            this.query.sortOrder === "asc"
                ? ""
                : "-";

        this.modelQuery =
            this.modelQuery.sort(`${prefix}${sortBy}`);

        return this;
    }

    paginate() {
        const page =
            Number(this.query.page) ||
            PAGINATION.DEFAULT_PAGE;

        const limit = Math.min(
            Number(this.query.limit) ||
            PAGINATION.DEFAULT_LIMIT,
            PAGINATION.MAX_LIMIT
        );

        const skip = (page - 1) * limit;

        this.page = page;
        this.limit = limit;

        this.modelQuery =
            this.modelQuery
                .skip(skip)
                .limit(limit);

        return this;
    }

    fields() {
        let fields =
            this.query.fields?.split(",").join(" ");

        if (!fields) {
            fields = "-password -__v";
        }

        this.modelQuery =
            this.modelQuery.select(fields);

        return this;
    }

    async countTotal() {
        const filterQuery =
            this.modelQuery.getFilter();

        const total =
            await this.modelQuery.model.countDocuments(
                filterQuery
            );

        return {
            page: this.page,
            limit: this.limit,
            total,
            totalPages: Math.ceil(
                total / this.limit
            ),
        };
    }
}

export default QueryBuilder;