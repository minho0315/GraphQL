const { ApolloServer } = require('apollo-server')

const typeDefs =`
enum PhotoCategory {
    SELFIE
    PORTRAIT
    ACTION
    LANDSCAPE
    GRAPHIC
}

type Photo {
    id: ID!
    url: String!
    name: String!
    description: String
    category: PhotoCategory!
}

input PostPhotoInput {
    name: String!
    category: PhotoCategory=PORTRAIT
    description: String
}

type Query {
    totalPhotos: Int!
    allPhotos: [Photo!]!
}

type Mutation {
    postPhoto(input: PostPhotoInput!): Photo!
}
`

var _id = 0
var photos = []

const resolvers = {
    Query: {
        totalPhotos: () => photos.length
    },

    Mutation: {
        postPhoto (parent, args) {
            var newPhoto = {
                id: _id++,
                ...args.input
            }
            photos.push(newPhoto)
            return newPhoto
        }
    },

    Photo: {
        url: parent => `http://yoursite.com/img/${parent.id}.jpg`
    }
}

const server = new ApolloServer ({
    typeDefs,
    resolvers
})

server
.listen()
.then(({url}) => console.log(`GraphQL Service running on ${url}`))