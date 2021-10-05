const { ApolloServer } = require('apollo-server')

// 스키마 정의
const typeDefs = `
enum PhotoCategory {
    SELFIE
    PORTRAIT
    ACTION
    LANDSCAPE
    GRAPHIC
}

type User {
    githubLogin: ID!
    name: String
    avatar: String
    postedPhotos: [Photo!]!
    inPhotos: [Photo!]!
}

type Photo {
    id: ID!
    url: String!
    name: String!
    description: String
    category: PhotoCategory!
    postedBy: User!
    taggedUsers: [User!]!
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

var tags = [
    {photoID: '1', userID: 'gPlake'},
    {photoID: '2', userID: 'sSchmidt'},
    {photoID: '2', userID: 'mHattrup'},
    {photoID: '2', userID: 'gPlake'}
]

var users = [
    {
        githubLogin: 'mHattrup',
        name: 'Mike Hattrup'
    },
    {
        githubLogin: 'gPlake',
        name: 'Glen Plake'
    },
    {
        githubLogin: 'sSchmidt',
        name: 'Scot Schmidt'
    }
]

var photos = [
    {
        id: '1',
        name: 'Dropping the Heart Chute',
        description: 'The heart chute is ...',
        category: 'ACTION',
        githubLogin: 'gPlake'
    },
    {
        id: '2',
        name: 'Enjoying the sunshine',
        category: 'SELFIE',
        githubLogin: 'sSchmidt'
    },
    {
        id: '3',
        name: 'Gunbarrel 25',
        description: '25 laps on gunbarrel today',
        category: 'LANDSCAPE',
        githubLogin: 'sSchmidt'
    }
]

// 리졸버
const resolvers = {
    Query: {
        totalPhotos: () => photos.length,
        allPhotos: () => photos
    },

    Mutation: {
        postPhoto(parent, args) {
            var newPhoto = {
                id: _id++,
                ...args.input
            }
            photos.push(newPhoto)
            return newPhoto
        }
    },

    Photo: {
        url: parent => `http://yoursite.com/img/${parent.id}.jpg`,
        postedBy: parent => {
            return users.find(u => u.githubLogin === parent.githubLogin)
        },
        taggedUsers: parent => tags
        .filter(tag => tag.photoID === parent.id)
        .map(tag => tag.userID)
        .map(userID => users.find(u => u.githubLogin === userID))
    },
    User: {
        postedPhotos: parent => {
            return photos.filter(p => p.githubUser === parent.githubLogin)
        },
        inPhotos: parent => tags
        .filter(tag => tag.userID === parent.id)
        .map(tag => tag.photoID)
        .map(photoID => photos.find(p => p.id === photoID))
    }
}

// 서버
const server = new ApolloServer({
    typeDefs,
    resolvers
})

server
    .listen()
    .then(({ url }) => console.log(`GraphQL Service running on ${url}`))