class Buckets extends Map
{
    constructor(options)
    {
        super();
        options = options || {};
        Object.defineProperties(this, {
            expireIn: {enumberable: true, writable: true, value: (options.expireIn === undefined) ? 0 : options.expireIn}
        });
    }

    add(bucket)
    {
        this.set(bucket.route, {
            bucket,
            expire: (this.expireIn) ? setTimeout(() => {this.delete(bucket.route);}, this.expireIn) : null
        });
	}
	
	get(route)
	{
		return this.has(route) ? super.get.call(this, route).bucket : null;
	}

    expire(bucket)
    {
        if (!this.expireIn) {return;}
        if (!this.has(bucket.route)) {return;}
        const b = super.get.call(this, bucket.route);
        if (b.expire) {return;}
        b.expire = setTimeout(() => {
            this.delete(bucket.route);
        }, this.expireIn);
    }

    stopExpire(bucket)
    {
        if (!this.expireIn) {return;}
        if (this.has(bucket.route)) {
            const b = super.get.call(this, bucket.route);
            if (!b.expire) {return;}
            clearTimeout(b.expire);
            b.expire = null;
        } else {
            this.add(bucket);
        }
    }
}

module.exports = Buckets;