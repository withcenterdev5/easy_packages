# Easy Realtime Database

This is a helper package for Firebase realtime database.



## Widgets

### Value and toggle

You can use with the combination of `Value` widget and `toggle` function to toggle a value of a node(path) in Realtime database.

```dart
Value(
  ref: FirebaseDatabase.instance.ref('/test/value'),
  builder: (v, r) => IconButton(
    icon: Text('Value Test: $v'),
    onPressed: () => toggle(r, 'yo'),
  ),
),
```


More comprehensive example:
```dart
Value(
  ref: FirebaseDatabase.instance.ref('tmp/a'),
  builder: (v, r) => TextButton(
    child: Text('Value: $v'),
    onPressed: () => r.set(
      'Time : ${DateTime.now()}',
    ),
  ),
),
Value.once(
  ref: FirebaseDatabase.instance.ref('tmp/a'),
  builder: (v, r) => TextButton(
    child: Text('Value: $v'),
    onPressed: () => r.set(
      'Time : ${DateTime.now()}',
    ),
  ),
),
```


## DatabaseLimitedListView

- See the example



## DatabaseLimitedQueryBuilder


- See the example
