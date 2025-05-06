import { makeExecutableSchema } from "@graphql-tools/schema";
import { mergeTypeDefs, mergeResolvers } from "@graphql-tools/merge";

import authenticationResolver from "./authentication/resolver.js";
import authenticationSchema from "./authentication/schema.js";

const typeDefs = mergeTypeDefs([authenticationSchema]);
const resolvers = mergeResolvers([authenticationResolver]);

const schema = makeExecutableSchema({
    typeDefs,
    resolvers
})

export default schema;