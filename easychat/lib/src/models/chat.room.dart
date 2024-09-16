import 'dart:async';

import 'package:easy_helpers/easy_helpers.dart';
import 'package:easychat/easychat.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:easyuser/easyuser.dart';

class ChatRoom {
  /// Field names used for the Firestore document
  static const field = (
    name: 'name',
    description: 'description',
    iconUrl: 'iconUrl',
    users: 'users',
    invitedUsers: 'invitedUsers',
    rejectedUsers: 'rejectedUsers',
    blockedUsers: 'blockedUsers',
    masterUsers: 'masterUsers',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    open: 'open',
    single: 'single',
    group: 'group',
    lastMessageAt: 'lastMessageAt',
    allMembersCanInvite: 'allMembersCanInvite',
    gender: 'gender',
    domain: 'domain',
  );

  /// [id] is the chat room id. This is the key of the chat room data.
  String id;

  /// [ref] is the data reference of the chat room.
  DatabaseReference get ref => ChatService.instance.roomsRef.child(id);

  /// [name] is the chat room name. If it does not exist, it is empty.
  String name;

  /// [description] is the chat room description. If it does not exist, it is empty.
  String description;

  /// The icon url of the chat room. optinal.
  String? iconUrl;

  /// [users] is the uid list of users who are join the room
  // Map<String, ChatRoomUser> users;
  Map<String, bool> users;

  /// Returns list of uids of members
  List<String> get userUids => users.keys.toList();

  /// [noOfUsers] is the number of users in the chat room.
  int get noOfUsers => users.length;

  bool get joined => userUids.contains(myUid);

  /// Map of `blocked-user-uid: true`.
  Map<String, bool> blockedUsers;
  List<String> get blockedUids => blockedUsers.keys.toList();

  List<String> masterUsers;

  DateTime createdAt;
  DateTime updatedAt;

  /// [open] is true if the chat room is open chat
  bool open;

  /// [single] is true if the chat room is single chat or 1:1.
  bool single;

  /// [group] is true if the chat room is group chat.
  bool group;

  /// [lastMessageAt] is the time when last message was sent to chat room.
  DateTime? lastMessageAt;

  /// [gender] to filter the chat room by user's gender.
  /// If it's M, then only male can enter the chat room. And if it's F,
  /// only female can enter the chat room.
  ///
  /// Note that, [gender] is not supported at this time.
  String gender;

  /// [domain] is the domain of the chat room. It can be the name of the app.
  ///
  String domain;

  bool allMembersCanInvite = false;

  /// Uids for single chat is combination of both users' uids separated by "---"
  /// Returns list of uids based on the room id.
  List<String> get uidsFromRoomId => id.contains("---") ? id.split("---") : [];

  ChatRoom({
    required this.id,
    required this.name,
    required this.description,
    this.iconUrl,
    required this.open,
    required this.single,
    required this.group,
    required this.users,
    required this.masterUsers,
    this.blockedUsers = const {},
    required this.createdAt,
    required this.updatedAt,
    this.lastMessageAt,
    this.allMembersCanInvite = false,
    required this.gender,
    required this.domain,
  });

  /// Return the chat room object from the snapshot.
  factory ChatRoom.fromSnapshot(DataSnapshot data) {
    if (data.value is int) {
      dog("data.value is int");
    }
    return ChatRoom.fromJson((Map<String, dynamic>.from(data.value as Map)), data.key!);
  }

  /// Return the chat room object from the json.
  factory ChatRoom.fromJson(Map<String, dynamic> json, String id) {
    return ChatRoom(
      id: id,
      name: json[field.name] ?? '',
      description: json[field.description] ?? '',
      iconUrl: json[field.iconUrl],
      open: json[field.open],
      single: json[field.single],
      group: json[field.group],
      users: json[field.users] is Map ? Map<String, bool>.from(json[field.users]) : {},
      masterUsers: List<String>.from(json[field.masterUsers]),
      blockedUsers: Map<String, bool>.from(json[field.blockedUsers] ?? {}),
      createdAt: json[field.createdAt] is num
          ? DateTime.fromMillisecondsSinceEpoch(json[field.createdAt])
          : DateTime.now(),
      updatedAt: json[field.updatedAt] is num
          ? DateTime.fromMillisecondsSinceEpoch(json[field.updatedAt])
          : DateTime.now(),
      lastMessageAt: json[field.lastMessageAt] == null
          ? DateTime.now()
          : DateTime.fromMillisecondsSinceEpoch(json[field.lastMessageAt]),
      allMembersCanInvite: json[field.allMembersCanInvite] ?? false,
      gender: json[field.gender],
      domain: json[field.domain],
    );
  }

  /// Converts the model into Map<String, dynamic>
  ///
  /// * Use it only for debug purpose !!
  Map<String, dynamic> toJson() {
    return {
      field.name: name,
      field.description: description,
      field.iconUrl: iconUrl,
      field.open: open,
      field.single: single,
      field.group: group,
      field.users: users,
      field.masterUsers: masterUsers,
      field.blockedUsers: blockedUsers,
      field.createdAt: createdAt,
      field.updatedAt: updatedAt,
      field.lastMessageAt: lastMessageAt,
      field.allMembersCanInvite: allMembersCanInvite,
      field.gender: gender,
      field.domain: domain,
    };
  }

  @Deprecated('DO NOT USE THIS: Why do we need this? Use it if it saved time and money')
  copyFromSnapshot(DataSnapshot doc) {
    copyFrom(ChatRoom.fromSnapshot(doc));
  }

  @Deprecated('DO NOT USE THIS: Why do we need this? Use it if it saved time and money')
  copyFrom(ChatRoom room) {
    // copy all the fields from the room
    id = room.id;
    name = room.name;
    description = room.description;
    iconUrl = room.iconUrl;
    open = room.open;
    single = room.single;
    group = room.group;
    users = room.users;
    masterUsers = room.masterUsers;
    blockedUsers = room.blockedUsers;
    createdAt = room.createdAt;
    updatedAt = room.updatedAt;
    lastMessageAt = room.lastMessageAt;
    allMembersCanInvite = room.allMembersCanInvite;
    gender = room.gender;
    domain = room.domain;
  }

  /// toString
  @override
  String toString() {
    return 'ChatRoom(${toJson()})';
  }

  /// [create] creates a new chat room.
  ///
  /// Returns the database reference of the chat room.
  ///
  /// If [id] is null, this will make new room id (preferred for group chat)
  static Future<DatabaseReference> create({
    String? id,
    String? name,
    String? description,
    String? iconUrl,
    bool open = false,
    // Group == false means the chat room is single chat
    bool group = true,
    bool single = false,
    // String? password, (NOT IMPLEMENTED YET)
    required Map<String, bool>? users,
    List<String>? masterUsers,
    bool allMembersCanInvite = false,
    String gender = '',
    String domain = '',
  }) async {
    if (single == true && (group == true || open == true)) {
      throw 'chat-room-create/single-cannot-be-group-or-open Single chat room cannot be group or open';
    }
    if (single == false && group == false) {
      throw 'chat-room-create/single-or-group Single or group chat room must be selected';
    }

    final newRoom = {
      if (name != null) field.name: name,
      if (description != null) field.description: description,
      if (iconUrl != null) field.iconUrl: iconUrl,
      field.open: open,
      field.single: single,
      field.group: group,
      // if (invitedUsers != null) field.invitedUsers: invitedUsers,
      field.users: users,
      field.masterUsers: [myUid],
      field.allMembersCanInvite: allMembersCanInvite,
      field.gender: gender,
      field.domain: domain,
      field.createdAt: ServerValue.timestamp,
      field.updatedAt: ServerValue.timestamp,
    };

    DatabaseReference newChatRoomRef;
    if (id == null) {
      newChatRoomRef = ChatService.instance.roomsRef.push();
    } else {
      newChatRoomRef = ChatService.instance.roomsRef.child(id);
    }
    await newChatRoomRef.update(newRoom);
    return newChatRoomRef;
  }

  /// [createSingle] creates a new single chat room.
  static Future<DatabaseReference> createSingle(
    String otherUid, {
    String domain = '',
  }) async {
    ///
    final ref = await create(
      group: false,
      open: false,
      single: true,
      id: singleChatRoomId(otherUid),
      users: {myUid!: true},
      masterUsers: [myUid!],
      domain: domain,
    );

    return ref;
  }

  /// [get] gets the chat room by id.
  static Future<ChatRoom?> get(String id) async {
    final snapshot = await ChatService.instance.roomRef(id).get();
    if (snapshot.exists == false) return null;
    return ChatRoom.fromSnapshot(snapshot);
  }

  /// [update] updates the chat room.
  Future<void> update({
    String? name,
    String? description,
    String? iconUrl,
    bool? open,
    bool? single,
    bool? group,
    // bool? verifiedUserOnly,
    // bool? urlForVerifiedUserOnly,
    // bool? uploadForVerifiedUserOnly,
    bool? allMembersCanInvite,
    // String? gender,
    // String? domain,
    // Object? lastMessageAt,
  }) async {
    if (single == true && (group == true || open == true)) {
      throw 'chat-room-update/single-cannot-be-group-or-open Single chat room cannot be group or open';
    }
    if (single == false && group == false) {
      throw 'chat-room-update/single-or-group Single or group chat room must be selected';
    }
    final updateData = {
      if (name != null) field.name: name,
      if (description != null) field.description: description,
      if (iconUrl != null) field.iconUrl: iconUrl,
      if (open != null) field.open: open,
      if (single != null) field.single: single,
      if (group != null) field.group: group,
      if (allMembersCanInvite != null) field.allMembersCanInvite: allMembersCanInvite,
      field.updatedAt: ServerValue.timestamp,
    };

    await ref.update(updateData);
  }
}
