/// A wrapper around a mutex, and a value protected by the mutex.
/// This type uses `fun.threading.Mutex` internally.
pub fn Guarded(comptime Value: type) type {
    return GuardedBy(Value, fun.threading.Mutex);
}

/// A wrapper around a mutex, and a value protected by the mutex.
/// `Mutex` should have `lock` and `unlock` methods.
pub fn GuardedBy(comptime Value: type, comptime Mutex: type) type {
    return struct {
        const Self = @This();

        /// The raw value. Don't use this if there might be concurrent accesses.
        unsynchronized_value: Value,
        #mutex: Mutex,

        /// Creates a guarded value with a default-initialized mutex.
        pub fn init(value: Value) Self {
            return .initWithMutex(value, fun.memory.initDefault(Mutex));
        }

        /// Creates a guarded value with the given mutex.
        pub fn initWithMutex(value: Value, mutex: Mutex) Self {
            return .{
                .unsynchronized_value = value,
                .#mutex = mutex,
            };
        }

        /// Locks the mutex and returns a pointer to the value. Remember to call `unlock`!
        pub fn lock(self: *Self) *Value {
            self.#mutex.lock();
            return &self.unsynchronized_value;
        }

        /// Unlocks the mutex. Don't use any pointers returned by `lock` after calling this method!
        pub fn unlock(self: *Self) void {
            self.#mutex.unlock();
        }

        /// Returns the inner unprotected value.
        ///
        /// You must ensure that no other threads could be concurrently using `self`. This method
        /// invalidates `self`, so you must ensure `self` is not used on any thread after calling
        /// this method.
        pub fn intoUnprotected(self: *Self) Value {
            defer self.* = undefined;
            fun.memory.deinit(&self.#mutex);
            return self.unsynchronized_value;
        }

        /// Deinitializes the inner value and mutex.
        ///
        /// You must ensure that no other threads could be concurrently using `self`. This method
        /// invalidates `self`.
        ///
        /// If neither `Value` nor `Mutex` has a `deinit` method, it is not necessary to call this
        /// method.
        pub fn deinit(self: *Self) void {
            fun.memory.deinit(&self.unsynchronized_value);
            fun.memory.deinit(&self.#mutex);
            self.* = undefined;
        }
    };
}

/// Uses `fun.safety.ThreadLock`.
pub fn Debug(comptime Value: type) type {
    return GuardedBy(Value, fun.safety.ThreadLock);
}

const fun = @import("fun");
