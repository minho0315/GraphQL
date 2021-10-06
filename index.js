const { ApolloServer } = require('apollo-server-express')
const express = require('express')
const expressPlayground = require('graphql-playground-middleware-express').default
const {GraphQLScalarType} = require('graphql')
const {MongoClient} = require('mongodb')
const fetch = require('cross-fetch')
require('dotenv').config()

// 스키마 정의
const typeDefs = `
scalar DateTime
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
    created: DateTime!
}

input PostPhotoInput {
    name: String!
    category: PhotoCategory=PORTRAIT
    description: String
}

type Query {
    totalPhotos: Int!
    allPhotos(after: DateTime): [Photo!]!
    totalUsers: Int!
    allUsers: [User!]!
}

type AuthPayload {
    token: String!
    user: User!
}

type Mutation {
    postPhoto(input: PostPhotoInput!): Photo!
    githubAuth(code: String!): AuthPayload!
}
`

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
        githubLogin: 'gPlake',
        "created": "3-28-1977"
    },
    {
        id: '2',
        name: 'Enjoying the sunshine',
        category: 'SELFIE',
        githubLogin: 'sSchmidt',
        "created": "1-2-1985"
    },
    {
        id: '3',
        name: 'Gunbarrel 25',
        description: '25 laps on gunbarrel today',
        category: 'LANDSCAPE',
        githubLogin: 'sSchmidt',
        "created": "2018-04-15T19:09:57.308Z"
    }
]

var _id = 0

// 리졸버
const resolvers = {
    Query: {
        totalPhotos: (parent, args, {db}) => 
        db.collection('photos')
        .estimatedDocumentCount(),

        allPhotos: (parent, args, {db}) => 
        db.collection('photos')
        .find()
        .toArray(),

        totalUsers: (parent, args, {db}) =>
        db.collection('users')
        .estimatedDocumentCount(),

        allUsers: (parent, args, {db}) =>
        db.collection('users')
        .find()
        .toArray()
    },

    Mutation: {
        postPhoto(parent, args) {
            var newPhoto = {
                id: _id++,
                ...args.input,
                created: new Date()
            }
            photos.push(newPhoto)
            return newPhoto
        },

        async githubAuth(parent, { code }, { db }) {

            let {
              message,
              access_token,
              avatar_url,
              login,
              name
            } = await authorizeWithGithub({
              client_id: '',
              client_secret: '',
              code
            });
        
            if (message) {
              throw new Error(message)
            }
        
            let latestUserInfo = {
              name,
              githubLogin: login,
              githubToken: access_token,
              avatar: avatar_url
            };
        
            const { ops:[user] } = await db
              .collection('users')
              .replaceOne({ githubLogin: login }, latestUserInfo, { upsert: true });
        
            return { user, token: access_token };
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
    },

    DateTime: new GraphQLScalarType({
        name: 'DateTime',
        description: 'A valid date time value.',
        parseValue: value => new Date(value),
        serialize: value => new Date(value).toISOString(),
        parseLiteral: ast => ast.value
    })
}

const requestGithubToken = credentials => {
    fetch(
        "https://github.com/login/oauth/access_token",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(credentials)
        }
    ).then(res => res.json())
    .catch(error => {
        throw new Error(JSON.stringify(error));
    })
}

const requestGithubUserAccount = token => {
    fetch(`https://api.github.com/user?access_token=${token}`)
        .then(toJSON)
        .catch(throwError);
}

const authorizeWithGithub = async credentials => {
    const {access_token} = await requestGithubToken(credentials)
    const githubUser = await requestGithubUserAccount(access_token)
    return { ...githubUser, access_token }
}


// 서버

async function start() {
    const app = express()
    const MONGO_DB = process.env.DB_HOST

    const client = await MongoClient.connect(
        MONGO_DB,
        {useNewUrlParser: true}
    )
    const db = client.db()
    const context = {db}
    const server = new ApolloServer({typeDefs, resolvers, context})
    await server.start();
    server.applyMiddleware({app})
    app.get('/', (req, res) => res.end('PhotoShare API에 오신 것을 환영합니다'))
    app.get('/playground', expressPlayground({ endpoint: '/graphql' }))
    app.listen({ port: 4000 }, () =>
        console.log(`GraphQL Server running at http://localhost:4000${server.graphqlPath}`
        )
    )
}

start()
