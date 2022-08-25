/* eslint-disable class-methods-use-this */
/*
    Copyright 2020 The caver-js Authors
    This file is part of the caver-js library.

    The caver-js library is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    The caver-js library is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with the caver-js. If not, see <http://www.gnu.org/licenses/>.
*/

const lodash = require('lodash')
const fs = require('fs')
const { CID } = require('multiformats/cid')
const _ = require('lodash')

/**
 * Representing a class for uploading and loading files to IPFS.
 * @hideconstructor
 * @class
 */
class IPFS {
    /**
     * Create an IPFS instance.
     * @param {string} [host]       The IPFS Node url to connect with.
     * @param {number} [port]       The port number to use.
     * @param {boolean} [ssl]       With or without SSL. If true, the https protocol is used. Otherwise, the http protocol is used.
     * @param {object} [options]    An object contains configuration variables.
     */
    constructor(host, port, ssl, options) {
        if (host !== undefined && port !== undefined && ssl !== undefined && options !== undefined) {
            this.setIPFSNode(host, port, ssl, options)
        }
    }

    /**
     * Initializes a connection with an IPFS Node.
     * When an IPFS Node information is set through this function, you can upload files to IPFS or load files from IPFS.
     *
     * @example
     * caver.ipfs.setIPFSNode('localhost', 5001, false)
     * caver.ipfs.setIPFSNode('localhost', 5001, false, { ... })
     * caver.ipfs.setIPFSNode('localhost', 5001, false, caver.ipfs.createOptions({projectId, projectSecret}))
     *
     * @param {string}  host        The IPFS Node url to connect with.
     * @param {number}  port        The port number to use.
     * @param {boolean} ssl         With or without SSL. If true, the https protocol is used. Otherwise, the http protocol is used.
     * @param {object}  [options]   An object contains configuration variables.
     * @return {void}
     */
    async setIPFSNode(host, port, ssl, options = {}) {
        const protocol = ssl ? 'https' : 'http'
        // Use the dynamic import function to load ipfs at runtime
        // refer to https://github.com/ipfs/js-ipfs/blob/master/docs/upgrading/v0.62-v0.63.md#esm
        const { create } = await import('ipfs-http-client')
        const createObject = { host, port, protocol }
        if (options.headers) {
            // Copy the headers object
            createObject.headers = JSON.parse(JSON.stringify(options.headers))
        }
        this.ipfs = await create(createObject)
    }

    /**
     * Makes an options object to use with ipfs request
     * 
     * @example
     * // You can create an option object with projectId and projectSecret for Infura IPFS Node
     * const options = caver.ipfs.createOptions({projectId, projectSecret})
     *
     * @param {object} opts     An object that contains various configuration variables.
     * @return {object}
     */
    createOptions(opts) {
        if (!opts || !_.isObject(opts)) {
            throw new Error(`Invalid parameter. Please send an object `)
        }

        const options = {}
        if (opts.projectId && opts.projectSecret) {
            const auth = 'Basic ' + Buffer.from(opts.projectId + ':' + opts.projectSecret).toString('base64')
            options.headers = options.headers? options.headers : {}
            options.headers.authorization = auth
        }
        return options
    }

    /**
     * Adds a file to IPFS. The {@link https://docs.ipfs.io/concepts/content-addressing/#content-addressing-and-cids|CID(Content Identifier)} of the uploaded file is returned.
     * If the path of a file is passed, the contents of the file are loaded from the path and uploaded to IPFS. If a buffer is passed, it is uploaded to IPFS directly.
     *
     * If the `data` parameter is a `Buffer` or `ArrayBuffer`, upload to IPFS directly without using `fs`.
     * If the `data` parameter is a string, use `fs` to read the file.
     * Since `fs` is a module that can only be used on the server side, if it is client-side code,
     * it must read the file in advance and pass the file contents in the format of `ArrayBuffer`.
     *
     * If you get a "Error: Can't resolve 'fs'" error when building your client code, add the following to your "webpack.config.json" file.
     * ```
     * module.exports = {
     *     ...
     *     node: {
     *         fs: 'empty',
     *     },
     *     ...
     * }
     * ```
     *
     * If you use Next.js web framework(https://nextjs.org/), add the following to your "next.config.json" file.
     * ```
     * module.exports = {
     *     ...
     *     webpack: (config, { isServer }) => {
     *         // Fixes npm packages that depend on `fs` module
     *         if (!isServer) {
     *             config.node = {
     *                 fs: 'empty'
     *             }
     *         }
     *         return config
     *     },
     *     ...
     * }
     * ```
     *
     * @example
     * const cid = await caver.ipfs.add('./test.txt')
     * const cid = await caver.ipfs.add(Buffer.from('test data'))
     *
     * @param {string|Buffer|ArrayBuffer} data The file path string or file contents.
     * @return {Promise<string>}
     */
    async add(data) {
        if (!this.ipfs) throw new Error(`Please set IPFS Node through 'caver.ipfs.setIPFSNode'.`)

        // Read file
        if (lodash.isString(data)) {
            if (typeof window !== 'undefined')
                throw new Error(`Cannot use fs module: Please pass the file contents as a parameter of type Buffer or ArrayBuffer.`)
            data = fs.readFileSync(data)
        }
        if (!lodash.isBuffer(data) && !lodash.isArrayBuffer(data)) throw new Error(`Invalid data: ${data}`)

        const ret = await this.ipfs.add(Buffer.from(data))
        return ret.path
    }

    /**
     * Returns a file addressed by a valid IPFS path.
     *
     * @example
     * const fileContents = await caver.ipfs.get('Qmd9thymMS6mejhEDZfwXPowSDunzgma9ex4ezpCSRZGwC')
     *
     * @param {string} hash An {@link https://docs.ipfs.io/concepts/content-addressing/#content-addressing-and-cids|CID(Content Identifier)} of the file to download.
     * @return {Promise<Buffer>}
     */
    async get(hash) {
        if (!this.ipfs) throw new Error(`Please set IPFS Node through 'caver.ipfs.setIPFSNode'.`)

        const ret = await this.ipfs.cat(hash)

        return (await ret.next(0)).value
    }

    /**
     * Converts a {@link https://docs.ipfs.io/concepts/content-addressing/#content-addressing-and-cids|CID(Content Identifier)} to a {@link https://multiformats.io/multihash/|Multihash}.
     *
     * @example
     * // This will return '0x1220dc1dbe0bcf1e5f6cce80bd3d7e7d873801c5a1732add889c0f25391d53470dc3'
     * const multihash = caver.ipfs.toHex('Qmd9thymMS6mejhEDZfwXPowSDunzgma9ex4ezpCSRZGwC')
     *
     * @param {string} hash A {@link https://docs.ipfs.io/concepts/content-addressing/#content-addressing-and-cids|CID(Content Identifier)} to convert.
     * @return {string}
     */
    toHex(hash) {
        const cid = CID.parse(hash)
        return `0x${Buffer.from(cid.toJSON().hash).toString('hex')}`
    }

    /**
     * Converts to {@link https://docs.ipfs.io/concepts/content-addressing/#content-addressing-and-cids|CID(Content Identifier)} from a {@link https://multiformats.io/multihash/|Multihash}.
     *
     * @example
     * // This will return 'Qmd9thymMS6mejhEDZfwXPowSDunzgma9ex4ezpCSRZGwC'
     * const multihash = caver.ipfs.fromHex('0x1220dc1dbe0bcf1e5f6cce80bd3d7e7d873801c5a1732add889c0f25391d53470dc3')
     *
     * @param {string} hash A {@link https://multiformats.io/multihash/|Multihash} to convert.
     * @return {string}
     */
    fromHex(contentHash) {
        const hex = contentHash.substring(2)
        // convert hex string to Uint8Array type
        const buf = Uint8Array.from(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
        return CID.decode(buf).toString()
    }
}

module.exports = IPFS
